---
title: "when your website gets attacked before anyone even visits"
description: "How I rebuilt server-side Google Tag Manager with Cloudflare Workers and Google Cloud Run to cut costs, filter bot traffic and keep first-party analytics."
searchTitle: "server-side GTM on Cloudflare Workers and Google Cloud Run"
published: 2026-08-04
updated: 2026-09-16
topics: [cloud, analytics, web-development]
wpId: 446
---

I’ve been running [server-side Google Tag Manager](https://developers.google.com/tag-platform/tag-manager/server-side/overview) on this website for a while.

Not because a personal portfolio website desperately needs an enterprise-grade analytics architecture - it absolutely does not - but because this site has always doubled as a bit of a playground for me.

If I’m going to spend my working life talking about marketing technology, analytics architecture, first-party data and cloud infrastructure, I may as well have somewhere I can actually build things without needing a business case, a procurement process, or someone asking me to quantify the ROI.

For server-side tagging, I had been using [Stape](https://stape.io/).

For a low-traffic personal website, it was perfect. Their free tier gave me a hosted server-side GTM container, support for a custom first-party domain, and their Custom Loader functionality for serving the web GTM container through that same first-party infrastructure.

It worked beautifully.

Until someone - or, more accurately, some automated collection of bots - decided my server-side tagging endpoint was far more interesting than any actual human ever had.

## what happened?

Stape’s free plan included a monthly 10k request allowance which was comfortably more than this site would ever organically consume.

Unfortunately, organic website visitors weren’t the problem.

Automated traffic started hammering the endpoint with the usual catalogue of internet nonsense: WordPress login attempts, random application paths, credential files, configuration files, Git repositories, API endpoints, admin panels and just about every other path scanners routinely throw at publicly accessible web infrastructure to see what sticks.

The important thing here is that none of these requests actually _did_ anything. I had some existing security rules in place, and server-side GTM had no client configured to claim them, so they were simply rejected.

But a request is still a request.

And overnight one night, the automated traffic burned through the free allowance and Stape disabled the container, all before I even woke up.

Which is admittedly a pretty funny way for a portfolio website with almost no traffic to exceed an analytics infrastructure quota.

The website itself was completely fine. Nothing had been compromised, no files had been exposed, and the bots weren’t interacting with the WordPress backend at all.

They were just generating enough garbage HTTP traffic against the measurement endpoint to knock my analytics offline.

So, I had a new project.

## what did I actually want?

The obvious answer would have been to remove server-side GTM entirely.

Google Analytics would work perfectly well without it, this website doesn’t generate enough traffic for the performance differences to matter, and there is precisely zero commercial impact if my analytics disappear for a day.

But that would have been boring.

I wanted to keep the server-side implementation because this site is partially an exercise in building and understanding this stuff in the first place.

I also wanted to preserve the things I liked about the existing implementation:

- an existing server-side GTM container
- an existing web GTM container
- a first-party measurement domain
- first-party delivery of Google tagging dependencies
- a server-side endpoint for GA4
- the ability to use GTM’s server preview environment
- protection from basic automated junk traffic
- the ability to scale to zero when nobody is using it
- and, importantly, essentially no fixed monthly infrastructure cost

Easy, right?

Well, as I discovered fairly quickly, Google’s recommended infrastructure architecture and my definition of “essentially no cost” were not especially well aligned.

## moving server-side GTM to Google Cloud

Google provides an official container image for running server-side Google Tag Manager, and Cloud Run is a very natural place to put it.

[Cloud Run](https://cloud.google.com/run) was already familiar territory for me from other enterprise server-side tagging implementations I’ve done, and the fit is almost perfect for a low-volume tagging endpoint.

It gives me:

- a managed container runtime
- HTTPS by default
- no servers to maintain
- automatic scaling
- the ability to scale completely to zero
- request-based billing
- configurable CPU and memory limits
- and a maximum instance limit so unexpected traffic can’t horizontally scale forever

So the underlying sGTM part was actually very simple; I deployed Cloud Run.

For both services I configured:

```
CPU:                1 vCPU
Memory:             512 MiB
Minimum instances:  0
Maximum instances:  1
Billing:            request-based
```

That maximum instance count is particularly important for this project.

I don’t need this architecture to survive a distributed denial-of-service attack while maintaining five-nines availability. I need it to avoid turning a bot attack into a surprisingly educational Google Cloud invoice.

If something sends a ridiculous amount of traffic at the endpoint, I would rather analytics become slow or temporarily unavailable than have Cloud Run enthusiastically scale out twenty copies of itself in response.

That is a very different requirement from a commercial production analytics platform, but it is exactly the right trade-off for this website.

## the custom domain problem

At this point, I had server-side GTM running successfully in Cloud Run.

Google gives every Cloud Run service a public `run.app` URL, so technically I could have stopped there.

But there was one fairly significant problem.

I didn’t want my browser-side analytics requests going to something like:

`https://some-service-123456789.region.run.app`

I already had a first-party tagging domain, and I wanted to keep it.

Among other things, using a first-party measurement hostname means browser requests remain part of my own domain architecture rather than obviously calling an unrelated third-party hostname.

Normally, the enterprise-friendly way to put Cloud Run behind your own hostname is to introduce additional Google Cloud networking infrastructure – typically a global external application load balancer, a serverless network endpoint group and the relevant routing configuration.

There’s nothing wrong with that architecture.

For an enterprise implementation, it is probably what I would build (and what I have built in the past).

But when I priced the infrastructure for this particular use case, I landed somewhere around A$100 per month once the required load-balancing components were included.

For context, the website receiving the analytics traffic costs considerably less than that to run...for a whole year.

![Two ways to put server-side GTM behind a custom domain. Google's recommended path runs through a Cloud Load Balancer and a serverless NEG to Cloud Run, for about A$100 a month; what I built runs through Cloudflare and a Worker to Cloud Run, for hobby-project money](./custom-domain-costs.png)

Paying around a hundred dollars every month so I could count the handful of people reading my blog seemed difficult to justify.

So, naturally, I started looking for another way.

## enter Cloudflare Workers

This website was already using [Cloudflare](https://www.cloudflare.com/).

That meant I already had DNS, proxying and edge security sitting in front of the site, and [Cloudflare Workers](https://www.cloudflare.com/products/workers/) gave me a programmable HTTP layer at the edge.

Which raised an obvious question:

Could I actually use a Worker as a lightweight reverse proxy between my existing measurement hostname and Cloud Run?

Something like:

```
www.harrisonjennings.au
        │
        │  analytics request
        ▼
measure.harrisonjennings.au
        │
        ▼
Cloudflare
        │
        ▼
Cloudflare Worker
        │
        ▼
Cloud Run
        │
        ▼
server-side GTM
```

Turns out: yes. And the Worker itself is almost disappointingly simple.

At its core, it takes the incoming request, reconstructs the same path and query string against a fixed Cloud Run origin, rebuilds trusted forwarding information, and sends the request upstream.

The worker looks like this:

```js
export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);

    // sGTM / browser tagging should only need these methods.
    const allowedMethods = ["GET", "HEAD", "POST", "OPTIONS"];

    if (!allowedMethods.includes(request.method)) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          Allow: allowedMethods.join(", "),
        },
      });
    }

    const upstreamUrl = new URL(env.SGTM_ORIGIN);

    upstreamUrl.pathname = incomingUrl.pathname;
    upstreamUrl.search = incomingUrl.search;

    const headers = new Headers(request.headers);

    // Proxy metadata supplied by the caller is untrusted. sGTM reads these
    // headers for cookie domain and client IP, so rebuild them from the
    // incoming Worker request and Cloudflare instead.
    headers.delete("Forwarded");
    headers.delete("X-Forwarded-For");
    headers.delete("X-Forwarded-Host");
    headers.delete("X-Forwarded-Proto");

    // The fetch URL already determines the Host header.
    // Preserve the original first-party hostname separately.
    headers.set("X-Forwarded-Host", incomingUrl.host);
    headers.set("X-Forwarded-Proto", "https");

    const clientIp = request.headers.get("CF-Connecting-IP");
    if (clientIp) {
      headers.set("X-Forwarded-For", clientIp);
    }

    const requestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      requestInit.body = request.body;
    }

    // Analytics collection must never be cached.
    if (
      upstreamUrl.pathname === "/g/collect" ||
      upstreamUrl.pathname === "/collect" ||
      upstreamUrl.pathname === "/j/collect"
    ) {
      requestInit.cache = "no-store";
    }

    return fetch(upstreamUrl.toString(), requestInit);
  },
};
```

The important part is that the origin is fixed.

A visitor cannot supply some arbitrary URL and convince my Worker to fetch it, which means this isn’t an open proxy.

:::note
**Update, September 2026:** I've since tightened one thing. The original Worker copied every incoming header and then overwrote the `X-Forwarded-*` ones, but it never removed the standard `Forwarded` header. Server-side GTM checks `Forwarded` before `X-Forwarded-Host` when it works out things like the cookie domain, so anyone could send their own and hand sGTM conflicting information about where a request came from. The Worker now throws away any forwarding headers the caller sends and rebuilds them from values Cloudflare provides. (Requests sent straight to the `run.app` URL skip the Worker entirely, which is the compromise I cover further down.)
:::

The Cloud Run origin itself is stored in a Worker environment variable rather than hard-coded into the source, and I’ve deliberately omitted the actual hostname here.

The Worker also restricts HTTP request methods to the handful that a browser-based tagging implementation should reasonably need and explicitly prevents analytics collection requests from being cached.

There’s really not much more to it. Which, increasingly, is my favourite type of cloud architecture.

## migrating without breaking everything

One useful thing about this project was that I didn’t actually need to rebuild any of my GTM configuration.

The existing web GTM container stayed.

The existing server GTM container stayed.

My GA4 configuration stayed.

The public measurement hostname stayed.

The only thing I was changing was the infrastructure sitting behind that hostname.

Before touching the live endpoint, I created a temporary hostname and routed that through the Worker to Cloud Run.

That let me test the entire chain independently. Server-side GTM Preview immediately became useful here.

If I requested some arbitrary path such as:

`/some-test-path`

the request appeared in Preview but returned:

`No client claimed the request`

with an HTTP 400 response.

Which initially looks like something is broken, but is exactly how sGTM should behave.

Server GTM is not a general-purpose web server. A request needs to match one of the configured Clients before anything happens.

Once I sent a real GA4 request to `/g/collect`, the GA4 Client claimed it, my server tags executed, and the outgoing GA4 request completed successfully.

At that point I knew the actual tagging pipeline worked.

## serving GTM first-party

Server-side GTM includes a Web Container Client which allows the server container to serve Google tagging dependencies itself.

Rather than loading the web container from:

`www.googletagmanager.com`

the website can load it through the first-party tagging domain using a randomised serving path.

The same hostname then receives the actual browser measurement requests:

`measure.harrisonjennings.au/g/collect`

which are claimed by the appropriate server-side GTM Client and processed normally.

This also resulted in Google Tag Manager recognising that Google Tag Gateway was active.

## stopping the internet from being the internet

Within hours of putting the new endpoint online, the Cloud Run logs started filling up with requests for things like:

```
/.git/config
/.env
/.env.production
/wp-login.php
/wp-json/
/phpmyadmin/
/actuator/env
/serviceAccountKey.json
/gcp-credentials.json
```

Some scanners were looking for WordPress. Some were probing common cloud credential filenames. Some were looking for Git repositories, environment files, GraphQL endpoints or application administration panels. And some appeared to just be throwing a dictionary at the hostname to see what stuck.

None of them did.

Every one of these requests returned an HTTP 400 because there was no sGTM Client capable of handling them. And due to the security layer within my WordPress build, these endpoints aren’t accessible anyway.

But that brought me almost directly back to the problem that started this project.

Even a failed request still has to reach Cloud Run before Cloud Run can fail it.

What I really wanted was to reject obviously useless traffic _before it ever reached Google Cloud_.

Thankfully, Cloudflare was already sitting in exactly the right place to do that.

## adding an edge firewall

[Cloudflare’s Web Application Firewall](https://www.cloudflare.com/products/waf/) (WAF) lets me apply custom rules against requests before they reach the Worker.

I deliberately avoided trying to create an exhaustive allowlist of valid server-side GTM paths.

That sounds appealing:

```
allow /g/collect
allow my GTM loader
block everything else
```

but in reality Google’s first-party tagging stack uses additional internal endpoints - the service-worker requests above being one example.

An overly enthusiastic allowlist could therefore break perfectly legitimate tagging behaviour the next time Google introduced or changed an internal route.

Instead, I took the opposite approach.

I only block paths which have no legitimate reason to exist on a server-side tagging hostname.

Broadly, that includes:

```
Git metadata
environment files
cloud credential files
WordPress administrative endpoints
phpMyAdmin
developer configuration directories
common server diagnostic endpoints
```

I’m deliberately not publishing the exact production rule, because there’s no useful reason to turn a portfolio article into a copy of my live edge-security configuration.

But the principle is simple:

```
obviously malicious / irrelevant request
        ↓
Cloudflare WAF
        ↓
BLOCK

versus

legitimate or unknown request
        ↓
Cloudflare Worker
        ↓
Cloud Run
        ↓
sGTM decides whether a Client claims it
```

This gives me two filtering layers.

Cloudflare removes the obvious garbage cheaply (well, freely) at the edge.

Server GTM remains responsible for deciding which legitimate-looking requests it actually understands.

## the security compromise

There is one important caveat to this architecture: Cloudflare is an edge protection layer rather than a complete origin-isolation boundary.

For this particular workload, I accepted that trade-off in exchange for avoiding the additional infrastructure and fixed cost required to build a more tightly restricted ingress architecture.

For a higher-value commercial implementation, I would instead restrict origin access so that traffic could only reach the tagging service through the approved ingress path.

This was a conscious compromise.

The architecture I would build for a high-value commercial implementation would look more like:

```
Internet
   ↓
managed edge / load balancer
   ↓
restricted origin
   ↓
Cloud Run
```

with the Cloud Run service inaccessible outside the approved ingress path.

That provides a substantially stronger security boundary.

It also introduces infrastructure and fixed costs which make very little sense for this particular website. For this implementation, the remaining risk is primarily availability and cost abuse rather than compromise.

There is no application filesystem being exposed through these requests, sGTM only responds to Clients configured inside the container, the Worker cannot fetch arbitrary origins, Cloud Run is capped at a single instance, and there are no secrets or arbitrary destination URLs exposed to inbound requests.

I can live with that.

## cost

The entire reason I went down this route instead of simply implementing the conventional Google Cloud architecture was cost.

The Cloud Run services scale to zero. The production tagging service is capped at one instance. Billing is request-based. The Cloudflare Worker runs inside the allowance available for this website. And the edge firewall removes at least some of the junk before it ever becomes a Google Cloud request.

At the traffic volumes this website receives, I expect the actual Cloud Run workload to sit comfortably within very low usage levels, and with the additional edge security I’ve put in place, the request limits should fall below Google’s ‘free’ processing quota.

There will always be some additional request volume compared with a traditional client-side implementation because the same server infrastructure now also serves Google tagging dependencies.

But for a personal website, that volume is tiny.

I also configured GCP budget alerts because “it should cost basically nothing” and “I would like to know if that suddenly stops being true” are two thoughts which should always exist together.

This isn't a hard spending cap - Google Cloud budgets (annoyingly) don’t work that way - but it does mean I should hear about abnormal spend before it becomes interesting.

## the final architecture

After all of that, the finished implementation looks like this:

![The finished architecture: the browser loads the site, then GTM and measurement requests from measure.harrisonjennings.au; Cloudflare's firewall and Worker pass them to two scale-to-zero Cloud Run services running server-side GTM and its preview, which send events on to Google Analytics 4](./final-architecture.png)

What I like most about this implementation is that every component has a very specific job.

Cloudflare handles the public edge.

The Worker handles routing.

Cloud Run handles compute.

GTM handles measurement logic.

And none of those layers is being asked to pretend it is something else.

## was any of this necessary?

Absolutely not.

I could remove the GTM snippet from this website tomorrow, install Google Analytics directly, and almost nobody would notice.

But that wasn’t really the point.

The useful part of projects like this is getting beyond the architecture diagram where everything is a neat rectangle connected by arrows.

The interesting stuff happened in the gaps:

- learning how first-party Google dependency serving behaves
- seeing Google Tag Gateway activate as part of that architecture
- discovering legitimate service-worker paths that made an aggressive WAF allowlist a bad idea
- watching public internet scanners arrive almost immediately after deployment
- working out where Cloudflare should stop and where sGTM should take over
- deciding which production-grade controls were actually appropriate for a personal website
- and building a cost model where failure means “analytics stops working” rather than “the cloud provider discovers my credit card limit”

That last one is probably the most important.

Cloud architecture is always a series of trade-offs. More redundancy costs more. Stronger isolation usually requires more infrastructure. Lower latency can mean keeping compute warm.

Greater protection against abuse can mean paid security products, authenticated origin architecture or additional networking layers.

For a commercial analytics platform processing meaningful volumes of business data, I would make different choices.

For a personal portfolio that exists partly so I can build things like this? This feels about right.

## wrapping up

I’ve deployed server-side tagging plenty of times before, but this project ended up being much more useful than simply moving a GTM container from one hosting provider to another.

It forced me to think about the surrounding infrastructure as a complete system: DNS, edge routing, HTTP proxy behaviour, container scaling, first-party tag serving, security filtering, caching, bot traffic, failure modes and cloud cost management.

And perhaps most importantly, it reinforced something I increasingly appreciate about cloud architecture: the most technically impressive solution is not automatically the best one.

I could have built this using Google’s full recommended load-balancing architecture.

It would have been more robust.

It would have provided a cleaner security boundary.

It would also have cost an absurd amount relative to the value of the workload it was protecting.

Instead, I ended up with a tiny Cloudflare Worker, two scale-to-zero Cloud Run services, an edge firewall and the same GTM containers I already had.

Is it how I would build server-side tagging for a bank?

No.

Is it a fairly elegant way to run first-party server-side analytics for a personal website without spending more on the measurement infrastructure than the website itself?

I think so.

And if the internet decides to attack again, Cloudflare can answer the door.
