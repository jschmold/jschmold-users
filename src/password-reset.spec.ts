import "mocha"
import { assert } from 'chai';
import { PasswordReset } from './password-reset';

describe('PasswordReset', function() {
  describe('$Generator', function() {
    it('only suppports () => string types', function() {
      let old = PasswordReset.Generator
      assert.throws(() => {
        // @ts-ignore
        PasswordReset.Generator = () => 3;
      });

      assert.throws(() => {
        // @ts-ignore
        PasswordReset.Generator = 2;
      });

      assert.doesNotThrow(() => {
        PasswordReset.Generator = () => 'It works';
      }, 'Does not accept valid generator')

      PasswordReset.Generator = old;
    });
  })

  describe('$ExpirationLength', function() {
    afterEach(() => PasswordReset.ExpirationLength = 1)
    it('accepts null', () => PasswordReset.ExpirationLength = null);
    it('accepts less than 1 as null', () => PasswordReset.ExpirationLength = -1);
    it('accepts greater than 0', () => PasswordReset.ExpirationLength = 32);
    it('sets expiration to null if <= 0, or null', function() {
      PasswordReset.ExpirationLength = -1;
      assert.isNull(PasswordReset.ExpirationLength);
      PasswordReset.ExpirationLength = 0;
      assert.isNull(PasswordReset.ExpirationLength);
      PasswordReset.ExpirationLength = null;
      assert.isNull(PasswordReset.ExpirationLength);
    })
  })

  describe('#hasExpired', function() {
    afterEach(() => {
      PasswordReset.ExpirationLength = 1;
    })
    it('evaluates true if limit exceeded', function() {
      PasswordReset.ExpirationLength = 0.5;
      let dt = new Date(new Date().getTime() - (5 * (60 ** 2 * 1000)));
      let reset = new PasswordReset('something');
      reset.created = dt;
      assert.isTrue(reset.hasExpired);
    });
    it('evaluates false if within limit', function() {
      assert.isFalse(new PasswordReset('3kjl3ljlj').hasExpired);
      let halfPast = new Date(new Date().getTime() + (0.5 * 60 ** 2 * 1000));
      let reset = new PasswordReset('ljlk1lkj1k2j');
          reset.created = halfPast;
      assert.isFalse(reset.hasExpired, 'Did not correctly evaluate expiry');
    });
    it('evaluates false if expiration null', function() {
      PasswordReset.ExpirationLength = null;
      assert.isFalse(new PasswordReset('2223').hasExpired);
    })
  })


  describe('$expiryDate', function() {
    it('returns a correct time', function() {
      let created = new Date();
      let expected = new Date(created.getTime() + (60 ** 2 * 1000));

      let reset = new PasswordReset(null);
          reset.created = created;

      assert.equal(PasswordReset.expiryDate(reset).valueOf(), expected.valueOf());
    })
  })

  describe('#expiration', function() {
    it('returns a correct time', function() {
      let created = new Date();
      let expected = new Date(created.getTime() + (60 ** 2 * 1000));

      let reset = new PasswordReset(null);
          reset.created = created;

      assert.equal(reset.expiration.valueOf(), expected.valueOf());
    })
  })


})