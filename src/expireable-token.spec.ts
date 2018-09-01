import "mocha"
import { assert } from 'chai';
import { ExpireableToken } from './expireable-token';

describe('ExpireableToken', function() {
  describe('$Generator', function() {
    it('only suppports () => string types', function() {
      let old = ExpireableToken.Generator
      assert.throws(() => {
        // @ts-ignore
        ExpireableToken.Generator = () => 3;
      });

      assert.throws(() => {
        // @ts-ignoree
        ExpireableToken.Generator = 2;
      });

      assert.doesNotThrow(() => {
        ExpireableToken.Generator = () => 'It works';
      }, 'Does not accept valid generator')

      ExpireableToken.Generator = old;
    });
  })

  describe('$ExpirationLength', function() {
    afterEach(() => ExpireableToken.ExpirationLength = 1)
    it('accepts null', () => ExpireableToken.ExpirationLength = null);
    it('accepts less than 1 as null', () => ExpireableToken.ExpirationLength = -1);
    it('accepts greater than 0', () => ExpireableToken.ExpirationLength = 32);
    it('sets expiration to null if <= 0, or null', function() {
      ExpireableToken.ExpirationLength = -1;
      assert.isNull(ExpireableToken.ExpirationLength);
      ExpireableToken.ExpirationLength = 0;
      assert.isNull(ExpireableToken.ExpirationLength);
      ExpireableToken.ExpirationLength = null;
      assert.isNull(ExpireableToken.ExpirationLength);
    })
  })

  describe('#hasExpired', function() {
    afterEach(() => {
      ExpireableToken.ExpirationLength = 1;
    })
    it('evaluates true if limit exceeded', function() {
      ExpireableToken.ExpirationLength = 0.5;
      let dt = new Date(new Date().getTime() - (5 * (60 ** 2 * 1000)));
      let reset = new ExpireableToken('something');
      reset.created = dt;
      assert.isTrue(reset.hasExpired);
    });
    it('evaluates false if within limit', function() {
      assert.isFalse(new ExpireableToken('3kjl3ljlj').hasExpired);
      let halfPast = new Date(new Date().getTime() + (0.5 * 60 ** 2 * 1000));
      let reset = new ExpireableToken('ljlk1lkj1k2j');
          reset.created = halfPast;
      assert.isFalse(reset.hasExpired, 'Did not correctly evaluate expiry');
    });
    it('evaluates false if expiration null', function() {
      ExpireableToken.ExpirationLength = null;
      assert.isFalse(new ExpireableToken('2223').hasExpired);
    })
  })


  describe('$expiryDate', function() {
    it('returns a correct time', function() {
      let created = new Date();
      let expected = new Date(created.getTime() + (60 ** 2 * 1000));

      let reset = new ExpireableToken(null);
          reset.created = created;

      assert.equal(ExpireableToken.expiryDate(reset).valueOf(), expected.valueOf());
    })
  })

  describe('#expiration', function() {
    it('returns a correct time', function() {
      let created = new Date();
      let expected = new Date(created.getTime() + (60 ** 2 * 1000));

      let reset = new ExpireableToken(null);
          reset.created = created;

      assert.equal(reset.expiration.valueOf(), expected.valueOf());
    })
  })


})