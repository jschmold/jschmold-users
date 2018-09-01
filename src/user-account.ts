import { IExpireableToken, ExpireableToken } from '.';
import { IPassword, Password } from '.';
import { SecondaryEmail } from './secondary-email';

/**
 * active: A user is active and unrestricted
 * locked: A user is not permitted access
 * activation: A user has not yet been activated
 */
export type AccountStatus = 'active' | 'locked' | 'activation'

/**
 * username: login using a username string
 * email: login using an email string
 * hybrid: login using either an email or a username
 */
export type AccountMode = 'username' | 'email' | 'hybrid'

let statusKeys: AccountStatus[] = [ 'active', 'locked', 'activation' ];

export interface IUserAccount {
  username?: string;
  password: IPassword;
  primaryEmail: string;
  reset?: IExpireableToken;
  emails?: SecondaryEmail[];
  status: AccountStatus;
  activation?: ExpireableToken;
}

export class UserAccount implements IUserAccount {
  reset?: IExpireableToken;
  emails?: SecondaryEmail[];
  activation?: ExpireableToken;

  /**
   * Get the default status for newly created accounts
   */
  static get DefaultStatus() {
    return UserAccount._defaultStatus;
  }

  /**
   * Set the default status 
   */
  static set DefaultStatus(obj: AccountStatus) {
    if (statusKeys.indexOf(obj) === -1)
      throw new Error('Invalid status: ' + obj);
    UserAccount._defaultStatus = obj;
  }

  private static _defaultStatus: AccountStatus  = 'activation';

  static createActivation(user: IUserAccount): IUserAccount {
    return { ... user, activation: new ExpireableToken(user.primaryEmail) };
  }

  static activate(user: IUserAccount, token: string): IUserAccount {
    if (user.activation == null)
      throw new Error('Unable to activate object without activation created');
    
    if (ExpireableToken.validateStrings(user.activation, token) === false)
      throw new Error('Unable to activate. Tokens for activation do not match.');

    let obj = {...user};

    delete obj.activation;

    return obj;
  }

  static addEmail(user: IUserAccount, email: string, label?: string): IUserAccount {
    let em = new SecondaryEmail(email, label);
    let obj = { ... user }
        obj.emails.push(em);
    return obj;
  }

  static removeEmail(user:IUserAccount, email: string | number): IUserAccount {
    let index = email as number;
    if (typeof email === 'string') {
      index = user.emails.findIndex((val: SecondaryEmail) => val.email === email as string);
    }
    if (typeof index !== 'number' || index < 0) return user;

    let obj = {... user};
        obj.emails.splice(index, 1);
    return obj;
  }

  static createReset(user: IUserAccount): IUserAccount {
    let obj = { ... user };
        obj.reset = new ExpireableToken(obj.primaryEmail);
    return obj;
  }

  static applyReset(user: IUserAccount, token: string): IUserAccount {
    if (ExpireableToken.validateStrings(user.reset, token) === false) 
      throw new Error('Token does not align with reset token');

    let obj = { ... user };
    delete obj.reset;
    return obj;
  }

  static setPrimaryEmail(user: IUserAccount, obj: string | number): IUserAccount {
    let primaryEmail = obj as string;
    if (typeof obj === 'number') {
      primaryEmail = user.emails[obj].email;
    }

    if (primaryEmail == null) throw new Error('No email to set');
    
    return { ... user, primaryEmail };
  }

  static async setPassword(user: IUserAccount, pwd: string | null): Promise<IUserAccount> {
    return { ... user, password: pwd == null ? null : await Password.create(pwd) };
  }

  static forceStatus(user: IUserAccount, status: AccountStatus): IUserAccount {
    return {... user, status };
  }

  static deactivate(user: IUserAccount): IUserAccount {
    return { ... user, status: 'locked' };
  }

  static reactivate(user: IUserAccount): IUserAccount {
    return { ... user, status: 'active' };
  }

  /** 
   * Internal constructor. Do not use this.
   */
  private constructor(
    public primaryEmail: string,
    public password: IPassword,
    public status: AccountStatus = 'activation',
    public username?: string,
  ) { 
    this.emails = []; 
  }
}