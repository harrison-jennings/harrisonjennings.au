```js
const calendar = document.querySelector('[data-cal]');
```

```js title="src/scripts/booking.js"
if (calendar) loadCal(calendar, { theme: 'dark' });
```

```vtl {2-3}
#set( $name = ${lead.FirstName} )
#if( $name )
  Hi ${name},
#else
  Hi there,
#end
```
