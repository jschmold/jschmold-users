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
    emails: []
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
      assert.isString(newObj.activation.token, 'Token is not a string');
      assert.equal(newObj.primaryEmail, newObj.activation.email, 'Emails did not match');
      assert.isDefined(newObj.activation.created, 'Did not assign a created date');
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

    it('returns a new object with the reset token', async function() {
      let user = await generateTestAccount();
      let ret = UserAccount.createReset(user);
      assert.isTrue(user !== ret, 'Did not respect immutability');
      assert.isDefined(ret.reset, 'Reset was not created');
      assert.isDefined(ret.reset.token, 'Token was not created');
      assert.equal(ret.reset.email, user.primaryEmail, 'Did not use primary email');

      

    })
    immutabilityRespect(async () => {
      let acc = await generateTestAccount();
      return [ UserAccount.createReset(acc), acc ];
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

      assert.isTrue(user.password.hash !== ret.password.hash, 'Did not hash password');
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


  // non-static functions
  describe('#createActivation', function() {
    
  })
  describe('#activate', function() {
    
  })
  describe('#addEmail', function() {
    
  })
  describe('#removeEmail', function() {
    
  })
  describe('#createReset', function() {
    
  })
  describe('#applyReset', function() {
    
  })
  describe('#setPrimaryEmail', function() {
    
  })
  describe('#setPassword', function() {
    
  })
  describe('#forceStatus', function() {
    
  })
  describe('#deactivate', function() {
    
  })
  describe('#reactivate', function() {
    
  })
})