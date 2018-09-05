import "mocha";
import { assert } from 'chai';
import { UserAccount, IUserAccount } from './user-account';
import { Password, IPassword } from "./password";
import { SecondaryEmail } from "./secondary-email";
import { ExpireableToken } from "./expireable-token";

function refCheck(a: any, b: any) {
  if (typeof a !== "object") return true;
  for(let key of Object.keys(a)) {
    if (b[key] == null) continue;
    if (typeof a[key] === 'object' && refCheck(a[key], b[key]) !== true) return false;
  }
  return true;
}

function immutabilityRespect<T>(fn: () => T[] | Promise<T[]>) {
  it('respected immutability', async function() {
    let [ a, b ] = await fn(); 
    assert.isTrue(refCheck(a, b), 'Did not respect immutability');
  })
}

let password: IPassword;

function generateTestAccount(): IUserAccount {
  return {
    primaryEmail: 'me@jonathanschmold.ca',
    password,
    status: 'active',
    emails: [],
  }
}

describe('UserAccount', function() {

  let emails = () => [
    new SecondaryEmail('one@example.com'),
    new SecondaryEmail('two@example.com'),
    new SecondaryEmail('three@example.com'),
  ]

  this.beforeEach(async () => {
    password = password || await Password.create('alskjdflkjaklsdjflk');
  });
  describe('$createActivation', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
      return [ acc, UserAccount.createActivation(acc) ];
    })
    it('generates a new token with the activation', async function() {
      let obj = await generateTestAccount();
      let newObj = UserAccount.createActivation(obj);
      assert.isDefined(newObj.activation);
      assert.isString(newObj.activation!.token, 'Token is not a string');
      assert.equal(newObj.primaryEmail, newObj.activation!.email, 'Emails did not match');
      assert.isDefined(newObj.activation!.created, 'Did not assign a created date');
    })
  })
  describe('$activate', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
          acc.activation = new ExpireableToken(acc.primaryEmail);
      return [ acc, UserAccount.activate(acc, acc.activation.token) ];
    })
    it('errors if tokens do not align', async function() {
      let obj = await generateTestAccount();
          obj.activation = new ExpireableToken(obj.primaryEmail);
      
      assert.throws(() => {
          UserAccount.activate(obj, 'asldkjflkasjdflkjp9u13kj')    
        },
        /token/i, 
        'Did not throw an error, or did not throw an error about token alignment'
      );
    })
    it('Errors if there is no token to activate', async function() {
      let user = await generateTestAccount();
      assert.throws(
        () => UserAccount.activate(user, '13o4oou4kljlk12j4lkjl1j2k4'),
        /exist/i, 
        'Did not throw an error about token not existing'
      );
    })
    it('Returns new object without activation if success', async function() {
      let user = await generateTestAccount();
          user.activation = new ExpireableToken(user.primaryEmail);
      let ret = UserAccount.activate(user, user.activation.token);
      assert.isTrue(user !== ret, 'Did not respect immutability');
      assert.isDefined(user.activation, 'Should not have deleted activation off original object');
      assert.isUndefined(ret.activation, 'Did not delete activation token');
    })
  })
  describe('$addEmail', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
      return [ acc, UserAccount.addEmail(acc, 'atet@exam.com') ];
    })
    it('Refuses non-string email arg', async function() {
      let user = await generateTestAccount();
      assert.throws(
        // @ts-ignore
        () => UserAccount.addEmail(user, 129890801283), 
        /string/i,
        'Should not support anything but strings'
      )
      
    })
    it('Returns a new object with the email inside the emails property', async function() {
      let user = await generateTestAccount();
      let email = 'test@example33.com';
      let ret = UserAccount.addEmail(user, email, 'A random label')

      assert.isTrue(user !== ret, 'Does not respect immutability');
      assert.isAtLeast(ret.emails.findIndex(em => em.email === email), 0, 'Email was not added');
    })
    
  })
  describe('$removeEmail', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
          acc.emails = emails();
      return [ acc, UserAccount.removeEmail(acc, 'one@example.com') ];
    })
    it('Does nothing if the email does not exist', async function() {
      let user = await generateTestAccount();
          user.emails = emails();
      let ret = UserAccount.removeEmail(user, 'four@example.com');
      assert.equal(ret.emails.length, 3, 'Removed an email but should not have')
    })
    it('Removes the correct email with a string arg', async function() {
      let user = await generateTestAccount();
          user.emails = emails();
      let ret = UserAccount.removeEmail(user, 'one@example.com');

      assert.equal(ret.emails.findIndex(em => em.email === 'one@example.com'), -1, 'Did not remove the email');
    })
    it('Removes the correct email with a number arg', async function() {
      let user = await generateTestAccount();
          user.emails = emails();
      let ret = UserAccount.removeEmail(user, 0);

      assert.equal(ret.emails.findIndex(em => em.email === 'one@example.com'), -1, 'Did not remove the email');
    })
    it('Respects immutability with the returned object', async function() {
      let user = await generateTestAccount();
          user.emails = emails();
      let ret = UserAccount.removeEmail(user, 0);
      assert.isTrue(user !== ret)
    })
    it('Respects immutability with the emails array ', async function() {
      let user = await generateTestAccount();
          user.emails = emails();
      let ret = UserAccount.removeEmail(user, 0);
      assert.isTrue(user.emails !== ret.emails);
    })
  })
  describe('$createReset', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
      return [ UserAccount.createReset(acc), acc ];
    })

    it('returns a new object with the reset token', async function() {
      let user = await generateTestAccount();
      let ret = UserAccount.createReset(user);
      assert.isTrue(user !== ret, 'Did not respect immutability');
      assert.isDefined(ret.reset, 'Reset was not created');
      assert.isDefined(ret.reset!.token, 'Token was not created');
      assert.equal(ret.reset!.email, user.primaryEmail, 'Did not use primary email');
    })
    
  })
  describe('$applyReset', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
          acc.reset = new ExpireableToken(acc.primaryEmail);
      return [ UserAccount.applyReset(acc, acc.reset.token), acc ];
    })

    it('errors if there is no reset', async function () {
      let user = await generateTestAccount();
      assert.throws(
        () => UserAccount.applyReset(user, 'asdlkjflkjalkdfjlkjasdf'),
        /exist/i,
        'Did not throw an error about the token not existing'
      );
    })

    it('errors if the reset is not valid', async function() {
      let user = await generateTestAccount();
          user.reset = new ExpireableToken(user.primaryEmail);
      assert.throws(
        () => UserAccount.applyReset(user, ';lkjd;ljkasd;ljkasd;jlkasdfjkasd'),
        /align/i,
        'Does not throw an error about tokens not aligning'
      );
    })

    it('returns a new object without the reset property', async function() {
      let user = await generateTestAccount();
          user.reset = new ExpireableToken(user.primaryEmail);
      let token = user.reset.token;
      let ret = UserAccount.applyReset(user, token);
      assert.isTrue(user !== ret, 'Does not respect immutability');
    })
  })
  describe('$setPrimaryEmail', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
      return [ UserAccount.setPrimaryEmail(acc,'asdklfjlkjaslkdfjkjasd@kjadsfkljkla.com'), acc ];
    })

    it('returns a new object with the changed primary email', async function() {
      let user = await generateTestAccount();
      let currentEmail = user.primaryEmail;
      let newEmail = 'jonathan@thisistest.com';
      let ret = UserAccount.setPrimaryEmail(user, newEmail);

      assert.isTrue(ret !== user, 'Did not respect immutability');
      assert.isTrue(ret.emails !== user.emails, 'Did not respect immutability on emails array')
      assert.notEqual(ret.primaryEmail, currentEmail, 'Did not modify emails');
      assert.equal(ret.primaryEmail, newEmail);
      
    });

    it('sets the correct email with a number argument', async function() {
      let user = await generateTestAccount();
          user.emails = emails()
      let currentEmail = user.primaryEmail;
      let newEmail = user.emails[2].email;
      let ret = UserAccount.setPrimaryEmail(user, 2);

      assert.isTrue(ret !== user, 'Did not respect immutability');
      assert.isTrue(ret.emails !== user.emails, 'Did not respect immutability on emails array')
      assert.isTrue(ret.password !== user.password, 'Did not respect immutability on password object')
      assert.notEqual(ret.primaryEmail, currentEmail, 'Did not modify emails');
      assert.equal(ret.primaryEmail, newEmail);
    })
    it('Errors if the index is out of bounds', async function() {
      let user = await generateTestAccount();
          user.emails = emails();
      
      assert.throws(
        () => UserAccount.setPrimaryEmail(user, 8),
        /out of bounds/i,
        'did not throw an out of bound'
      );
    })
  })
  describe('$setPassword', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
      return [ await UserAccount.setPassword(acc, 'asdkfkjalksdjf'), acc ];
    })
    
    it('returns a new password object', async function() {
      let user = await generateTestAccount();
      let pwdString = 'ldksflkjalsdfjlasdf';
      let ret = await UserAccount.setPassword(user, pwdString);

      assert.isTrue(user !== ret, 'Did not respect immutability on object');
      assert.isTrue(user.emails !== ret.emails, 'Did not respect immutability on emails');
      assert.isTrue(user.password !== ret.password, 'Did not respect immutability on password');
    })
    it('hashes the password', async function() {
      let user = await generateTestAccount();
      let pwdString = 'asdflkjlkadklfjakjsdf';
      let ret = await UserAccount.setPassword(user, pwdString);

      assert.isTrue(user.password!.hash !== ret.password!.hash, 'Did not hash password');
    })
  })
  describe('$forceStatus', function() {
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
      return [ UserAccount.forceStatus(acc, 'locked'), acc ];
    })
    it('returns a new object with the correct status', async function() {
      let obj = await generateTestAccount();
      let ret = UserAccount.forceStatus(obj, 'locked');
      assert.notEqual(obj.status, ret.status, 'Did not assign new status (same as old)');
      assert.equal(ret.status, 'locked', 'Did not assign new status')
    })
    it('errors on invalid status', async function() {
      let obj = await generateTestAccount();

      assert.throws(
        // @ts-ignore
        () => UserAccount.forceStatus(obj, 'lkjalsdfkjad'),
        /invalid.*status/i,
        'Did not throw an error about invalid status'
      );
    })
  })
  describe('$deactivate', function() {
    immutabilityRespect(async () => {
      let acc = generateTestAccount();
      return [ UserAccount.deactivate(acc), acc ];
    })
    it('returns a new object with the locked status', async function() {
      let obj = await generateTestAccount();
      let ret = UserAccount.deactivate(obj);
      assert.equal(ret.status, 'locked', 'Did not set status');
    })
  })
  describe('$reactivate', function() {
    immutabilityRespect(async () => {
      let acc = generateTestAccount();
          acc.status = 'locked';
      return [ UserAccount.reactivate(acc), acc ];
    })
    it('returns a new object with the locked status', async function() {
      let obj = await generateTestAccount();
      let ret = UserAccount.reactivate(obj);
      assert.equal(ret.status, 'active', 'Did not set status');
    })
  })
  describe('$create', function () {
    it('Properly initializes an IUserAccount', async function() {
      let user = await UserAccount.create('anemail@example.com', 'asdljadjkladljkdsjklld');
      assert.isDefined(user, 'Create did not resolve an object');
      assert.isDefined(user.password, 'Password did not get created');
      assert.isDefined(user.primaryEmail, 'Primary email left unset');
      assert.isDefined(user.status, 'Did not create status');
      assert.equal(user.status, UserAccount.DefaultStatus, 'Status did not assign correctly');
    })
  })
  describe('$register', function() {
    it('Initializes an IUserAccount with a registration token', async function() {
      let user = await UserAccount.register('anemail@example.com', 'asdljadjkladljkdsjklld');
      assert.isDefined(user, 'Create did not resolve an object');
      assert.isDefined(user.password, 'Password did not get created');
      assert.isDefined(user.activation, 'Activation did not get created');
      assert.isDefined(user.primaryEmail, 'Primary email left unset');
      assert.isDefined(user.status, 'Did not create status');
      assert.equal(user.status, 'activation', 'Status did not assign correctly');
    });
  });
  describe('#createActivation', function() {
    it('sets the activation on the instance', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
      user.createActivation();
      assert.isDefined(user.activation);
      assert.isTrue(user.activation!.created.valueOf() <= new Date().valueOf());
    })
  })
  describe('$login', function() {
    it('Errors on non-active status for account', async function() {
      let acc = await generateTestAccount();
          acc.status = 'activation';

      let reason: Error | null  = null;
      await UserAccount.login(acc, 'asdfljkasdjklsadjklasd')
        .catch(err => reason = err);
      assert.isDefined(reason, 'Did not throw error');
      assert.isDefined(/(inactive|non-active|status)/i.exec(reason!.message));
    })
    it('Errors on undefined password for account', async function() {
      let acc = await generateTestAccount();
      delete acc.password;

      let reason: Error | null  = null;
      await UserAccount.login(acc, 'asdfljkasdjklsadjklasd')
        .catch(err => reason = err);

      assert.isDefined(reason, 'Did not throw error');
      assert.isDefined(/(undefined|password)/i.exec(reason!.message));
    })
    it('returns false on incorrect password', async function() {
      let acc = await generateTestAccount();
      let result = await UserAccount.login(acc, 'asdfljkasdjklsadjklasd');
      assert.isFalse(result);
    })
    it('returns true on correct password', async function() {
      let acc = await generateTestAccount();
          acc.password = await Password.create('MyTestPassword123');
      let result = await UserAccount.login(acc, 'MyTestPassword123');
      assert.isTrue(result);
    })
  })

  // ========
  // Instance
  // ========

  describe('#activate', function() {
    it('refuses invalid token', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.createActivation();
      assert.throws(
        () => user.activate('asdflkasdjlkasdjflkadsjf'),
        /invalid/i,
        'Did not throw error about invalid token'
      );
    })
    it('removes the activation field on success', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.createActivation();
      let token = user.activation!.token;
      user.activate(token);
      assert.isUndefined(user.activation, 'Did not remove token');
    })
  })
  describe('#addEmail', function() {
    it('adds the email to the emails array', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.addEmail('test@index.cs', 'A random label');
      assert.isAtLeast(user.emails.findIndex(em => em.email === 'test@index.cs'), 0, 'Did not add email');
    })
  })
  describe('#removeEmail', function() {
    it('removes the email from the emails array', async function() {
      let ems = emails();
      let user = UserAccount.fromObject(await generateTestAccount());
          user.emails = ems.map(obj => ({... obj}));

      user.removeEmail(ems[0].email);
      assert.equal(user.emails.findIndex(obj => obj.email === ems[0].email), -1, 'Did not remove email')
    })
    it('does nothing if the email is not in the array', async function() {
      let ems = emails();
      let user = UserAccount.fromObject(await generateTestAccount());
          user.emails = ems.map(obj => ({... obj}));

      user.removeEmail('nothing@happens.com');
      assert.equal(ems.length, user.emails.length, 'Something was removed but should not have been');
    })
  })
  describe('#createReset', function() {
    it('sets the reset field', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.createReset()
      assert.isDefined(user.reset);
      assert.isDefined(user.reset!.token)
      assert.isDefined(user.reset!.email)
      assert.isDefined(user.reset!.email)
      assert.equal(user.reset!.email, user.primaryEmail);
    })
  })
  describe('#applyReset', function() {
    it('rejects if there is no reset field set', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
      assert.isUndefined(user.reset, 'Reset was already set');
      assert.throws(
        () => user.applyReset('lklkasdjfljkadslkasdlkjsd'),
        /(exist|undefined|unset)/i,
        'Did not throw an error about token not existing'
      )
    })
    it('deletes the reset field', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.reset = new ExpireableToken(user.primaryEmail);
      let token = user.reset.token;

      user.applyReset(token);
      assert.isUndefined(user.reset, 'Was not expecting reset to be defined');      
      assert.isFalse('reset' in user, 'Did not remove field')
    })
  })
  describe('#setPrimaryEmail', function() {
    it('sets the primary email with a string', async function() {
      let email = 'myexample@exmaple.com'
      let user = UserAccount.fromObject(await generateTestAccount());
          user.setPrimaryEmail(email);
      assert.equal(user.primaryEmail, email, 'Did not assign primary')
    })
    it('sets the primary email from the emails array using the index', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.emails = emails();
          user.setPrimaryEmail(0);
      assert.equal(user.primaryEmail, user.emails[0].email, 'Did not set at index 0');
    })
    it('errors if the email does not exist with an out of bound index', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.emails = emails()
      assert.throws(
        () => user.setPrimaryEmail(6),
        /(bounds|index)/i,
        'Did not throw an error for an out of bound index'
      );
    })
  })
  describe('#setPassword', function() {
    it('overwrites the password object', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
      let pwd  = { ... user.password } as IPassword;

      await user.setPassword('asdlkfjlkasdflkjsdlkjsdkjlasljk');
      assert.notEqual(user.password!.hash, pwd.hash);
      assert.notEqual(user.password!.created, pwd.created);
    })
    it('Removes password if given nothing', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());

      await user.setPassword();
      assert.isUndefined(user.password);
    })
  })
  describe('#forceStatus', function() {
    it('sets the status on a valid status', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());

      user.forceStatus('activation');
      assert.equal(user.status, 'activation', 'Did not set activation');

      user.forceStatus('active');
      assert.equal(user.status, 'active', 'Did not set active');

      user.forceStatus('locked');
      assert.equal(user.status, 'locked', 'Did not set locked');
    })
    it('errors on invalid statuses', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());

      assert.throws(
        // @ts-ignore
        () => user.forceStatus('kladsklfa'),
        /(invalid)/i,
        'Did not throw an error about invalid activation'
      );
    })
  })
  describe('#deactivate', function() {
    it('sets the status to locked', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.deactivate();
      assert.equal(user.status, 'locked', 'Did not set status accurately');
    })
  })
  describe('#reactivate', function() {
    it('sets the status to active', async function() {
      let user = UserAccount.fromObject(await generateTestAccount());
          user.reactivate();
      assert.equal(user.status, 'active', 'Did not set status accurately');
    })
  })
})