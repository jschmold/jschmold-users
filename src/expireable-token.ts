import { randomBytes } from "crypto";

export interface IExpireableToken {
  /** The date that the reset was generated */
  created: Date;
  /** The token that is to be validated against */
  token: string;
  /** The email that the token was dispatched to */
  email: string;
}

/**
 * The class used in an authentication module for password resets and activations.
 */
export class ExpireableToken implements IExpireableToken {

  /**
   * Set the function that generates tokens. It is recommended the tokens are LONG.
   */
  static set Generator(fn: () => string) {
    let tst = fn();
    if (typeof tst !== `string`)
      throw new Error('String generator does not return a string');

    ExpireableToken._generator = fn;
  }

  /**
   * Function used for generating tokens
   */
  static get Generator() {
    return ExpireableToken._generator;
  }

  private static _generator = () => randomBytes(64).toString('hex');

  /**
   * The expiration length in hours
   */
  static set ExpirationLength(num: number | null) {
  
    if (typeof num !== 'number' && num !== null)
      throw new Error('ExpirationLength is not a valid value. Supports -1, null, and numbers greater than 0')
    
    if (num == null || num <= 0)
      ExpireableToken._expirationLength = null;
    else
      ExpireableToken._expirationLength = num;
  }

  static get ExpirationLength() {
    return ExpireableToken._expirationLength;
  }

  private static _expirationLength: number | null = 1;

  /**
   * Determine whether a password reset has expired or not
   * @param reset 
   */
  static hasExpired(reset: IExpireableToken) {
    let expiration = ExpireableToken.expiryDate(reset);
    if (ExpireableToken._expirationLength === null || expiration == null) 
      return false;
    
    return new Date().valueOf() >= expiration.valueOf();
  }

  /**
   * Calculate the expiration of a reset object
   * @param reset 
   */
  static expiryDate(reset: IExpireableToken) {
    if (ExpireableToken.ExpirationLength == null) return null;
    return new Date(reset.created.getTime() + (ExpireableToken.ExpirationLength * (60 ** 2) * 1000));
  }

  /**
   * Validate that a string token and email match up against an IExpireableToken
   * @param obj 
   * @param token 
   * @param email 
   */
  static validateStrings(obj: IExpireableToken | undefined, token: string) {
    return obj != null && obj.token === token;
  }


  /**
   * Validate that objB matches objA
   * @param objA 
   * @param objB 
   */
  static validate(objA: IExpireableToken, objB: IExpireableToken) {
    return ExpireableToken.validateStrings(objA, objB.token);
  }

  /**
   * Determine whether this password reset has expired or not
   */
  get hasExpired() {
    return ExpireableToken.hasExpired(this);
  }

  /**
   * Get the expiration date of this reset
   */
  get expiration() {
    return ExpireableToken.expiryDate(this);
  }

  created: Date;
  token: string;

  constructor(public email: string) {
    this.created = new Date();
    this.token = ExpireableToken.Generator();
  }

  /**
   * Validate that another ExpireableToken is the same as this one
   * @param other 
   */
  validate(other: IExpireableToken) {
    return ExpireableToken.validate(this, other);
  }


  /**
   * Validate that a token and email match up with this object
   * @param token 
   * @param email 
   */
  validateStrings(token: string) {
    return ExpireableToken.validateStrings(this, token);
  }

}