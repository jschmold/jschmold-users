import { randomBytes } from "crypto";

interface IPasswordReset {
  /** The date that the reset was generated */
  created: Date;
  /** The token that is to be validated against */
  token: string;
  /** The email that the token was dispatched to */
  email: string;
}

/**
 * The class used in an authentication module for password resets.
 */
export class PasswordReset implements IPasswordReset {

  /**
   * Set the function that generates tokens. It is recommended the tokens are LONG.
   */
  static set Generator(fn: () => string) {
    let tst = fn();
    if (typeof tst !== `string`)
      throw new Error('String generator does not return a string');

    PasswordReset._generator = fn;
  }

  /**
   * Function used for generating tokens
   */
  static get Generator() {
    return PasswordReset._generator;
  }

  private static _generator = () => randomBytes(64).toString('hex');

  /**
   * The expiration length in hours
   */
  static set ExpirationLength(num: number) {
  
    if ((typeof num !== 'number' && num !== null))
      throw new Error('ExpirationLength is not a valid value. Supports -1, null, and numbers greater than 0')
    
    if (num <= 0) PasswordReset._expirationLength = null;
    else PasswordReset._expirationLength = num;
  }

  static get ExpirationLength() {
    return PasswordReset._expirationLength;
  }

  private static _expirationLength = 1;

  /**
   * Determine whether a password reset has expired or not
   * @param reset 
   */
  static hasExpired(reset: IPasswordReset) {
    if (PasswordReset._expirationLength === null) 
      return false;
    
    return new Date().valueOf() >= PasswordReset.expiryDate(reset).valueOf();
  }

  /**
   * Calculate the expiration of a reset object
   * @param reset 
   */
  static expiryDate(reset: IPasswordReset) {
    if (PasswordReset.ExpirationLength == null) return null;
    return new Date(reset.created.getTime() + (PasswordReset.ExpirationLength * (60 ** 2) * 1000));
  }

  /**
   * Determine whether this password reset has expired or not
   */
  get hasExpired() {
    return PasswordReset.hasExpired(this);
  }

  /**
   * Get the expiration date of this reset
   */
  get expiration() {
    return PasswordReset.expiryDate(this);
  }

  created: Date;
  token: string;

  constructor(public email: string) {
    this.created = new Date();
    this.token = PasswordReset.Generator();
  }

}