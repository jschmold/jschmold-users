import * as bcrypt from 'bcrypt';

export interface IPassword {
  /** A base64 string hash */
  hash: string;

  /** The salt that was applied to the password */
  salt: string;

  /** The date that the password was created */
  created: Date;
}

/**
 * To hash a new password, use Password.Create. 
 * Note: Never use the constructor. It will not do what you want.
 * @example 
 *  // to create a password
 *  let pwd = await Password.create(pwdString);
 *  // to validate
 *  pwd.validate(pwdString);
 *  // to validate password loaded from DB
 *  Password.validate(pwd, pwdString);
 */
export class Password implements IPassword {

  /** Get the number of bcrypt rounds */
  public static get Rounds() {
    return Password._rounds;
  }

  /** Set the number of bcrypt hash rounds */
  public static set Rounds(value: number) {
    Password._rounds = value;
  }

  private static _rounds: number = 8;

  /**
   * Hash a new password.
   */
  public static async create(toHash: string): Promise<Password> {
    let salt = await bcrypt.genSalt(Password._rounds);
    let hash = await bcrypt.hash(toHash, salt);
    return new Password(hash, salt);
  }

  /**
   * Validate any IPassword object against a raw string
   * @param pwd 
   * @param raw 
   */
  public static async validate(pwd: IPassword, raw: string) {
    return bcrypt.compare(raw, pwd.hash);
  }

  /**
   * Create a new password object. DO NOT USE THIS, use Password.create instead.
   */
  protected constructor(
    public hash: string,
    public salt: string,
    public created: Date = new Date()
  ) { }

  /**
   * Validate a raw string against this password
   * @param pwd 
   */
  public async validate(pwd: string) {
    return Password.validate(this, pwd);
  }
}
