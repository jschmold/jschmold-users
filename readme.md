
Password hash rounds are stored in the application
If you increase the hash rounds, use the 'Created' date to determine hash rounds, and to suggest resets to users

Testing methodology
```
  $method -- A static/class method
  #method -- An instance method
```

The easiest way to remember how this library works is this. Instance methods are written to modify `this` instance, and
class methods are written to return something.

For example. Lets say you're more of an object oriented programmer. You can work it like this

```
let myInstance = className.fromObject()
myInstance.doModification();
saveInDatabase(myInstance);
```

Or, if you're more functional

```
let obj = loadFromDatabase(/*query*/)
    obj = className.PerformModification(obj);
saveInDatabase(obj);

// or

saveInDatabase(
  className.PeformModification(
    loadFromDatabase({
      // query
    })
  )
);
```