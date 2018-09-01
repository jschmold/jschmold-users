import "mocha"
import { Password } from './password';
import { assert } from 'chai';

describe('Password', function() {

  describe('$create', function() {
    it('hashes password', async function() {
      let pwdString = 'p91u35lkhoiyadsfkhp9';
      let pwd = await Password.create(pwdString);
      assert.notEqual(pwdString, pwd.hash);
    })
    it('has new created date', async function() {
      let date = new Date();
      let pwd = await Password.create('13098kh14hakasdf');
      assert.isDefined(pwd.created, 'Did not create a date at all');
      assert.isAtLeast(pwd.created.valueOf(), date.valueOf(), 'Did not create a new date');
    })
    it('contains salt', async function() {
      let pwd = await Password.create('lksjdlkjfsldkf');
      assert.isDefined(pwd.salt, 'Did not create a salt');
      assert.isAtLeast(pwd.salt.length, 10, 'Unlikely that salt is long enough: ' + pwd.salt);
    });

    it('Does not create identical hashes with the same string', async function() {
      let pwdString = 'ki23h4kjhoosdhasdfpy83';
      let pwd1 = await Password.create(pwdString);
      let pwd2 = await Password.create(pwdString);
      assert.notEqual(pwd1.hash, pwd2.hash);
    })
  });

  describe("$validate", function() {
    it('validates same string', async function() {
      let pwdString = 'kh124iyhwgohkgoiyas0A';
      let pwd = await Password.create(pwdString);
      assert.isTrue(await Password.validate(pwd, pwdString));
    });

    it('does not validate differing strings', async function() {
      let pwdString = 'kh124iyhwgohkgoiyas0A';
      let pwd = await Password.create(pwdString);
      assert.isFalse(await Password.validate(pwd, '9217kho86osdfh8yo1k'));
    });
  })

  describe('#validate', function() {
    it('validates same string', async function() {
      let pwdString = 'kh124iyhwgohkgoiyas0A';
      let pwd = await Password.create(pwdString);
      assert.isTrue(await pwd.validate(pwdString));
    });

    it('does not validate differing strings', async function() {
      let pwdString = 'kh124iyhwgohkgoiyas0A';
      let pwd = await Password.create(pwdString);
      assert.isFalse(await pwd.validate('9217kho86osdfh8yo1k'));
    });
  });

});
