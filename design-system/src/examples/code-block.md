```js title="src/scripts/booking.js"
const calendar = document.querySelector('[data-cal]');
if (calendar) loadCal(calendar, { theme: 'dark', hideEventTypeDetails: true });
```

```vtl {2-3}
#set($name = ${lead.FirstName})
#if($name)
  Hi ${name},
#else
  Hi there,
#end
```

```sh
$ npm run dev
```
