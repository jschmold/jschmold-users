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
  username?:    string;
  primaryEmail: string;
  emails:       SecondaryEmail[];
  status:       AccountStatus;
  activation?:  ExpireableToken;
  password?:    IPassword;
  reset?:       IExpireableToken;
}

export class UserAccount implements IUserAccount {
  activation?: ExpireableToken;
  emails:      SecondaryEmail[] = [];
  reset?:      IExpireableToken;

  /**
   * Get the default status for newly created accounts
   */
  static get DefaultStatus() {
    return UserAccount._defaultStatus;
  }

  /**
   * Set the default status 
   * @param obj
   * @throws Invalid status
   */
  static set DefaultStatus(obj: AccountStatus) {
    if (statusKeys.indexOf(obj) === -1)
      throw new Error('Invalid status: ' + obj);
    UserAccount._defaultStatus = obj;
  }

  private static _defaultStatus: AccountStatus  = 'activation';

  /**
   * Generate an activation token for a user account
   * @param user 
   */
  static createActivation(user: IUserAccount): IUserAccount {
    let obj = UserAccount.fromObject(user);
    return { ... obj, activation: new ExpireableToken(user.primaryEmail), emails: Array.from(user.emails || []) };
  }

  /**
   * Attempt to activate a user account using a token
   * @param user 
   * @param token 
   * @throws No user activation
   * @throws Token does not match
   */
  static activate(user: IUserAccount, token: string): IUserAccount {
    if (user.activation == null)
      throw new Error('Unable to activate object. Activation does not exist on object.');
    
    if (ExpireableToken.validateStrings(user.activation, token) === false)
      throw new Error('Unable to activate. Tokens for activation do not match.');

    let cloned = UserAccount.fromObject(user);
    let obj = {...cloned, emails: Array.from(user.emails || [])};

    delete obj.activation;

    return obj;
  }

  /**
   * Add an email to a user account with an optional label
   * @param user 
   * @param email 
   * @param label 
   */
  static addEmail(user: IUserAccount, email: string, label?: string): IUserAccount {
    if (typeof email !== 'string')
      throw new TypeError('Email needs to be of type string');
    let emails = [
      ... (user.emails),
      new SecondaryEmail(email, label)
    ];
    return { ... UserAccount.fromObject(user), emails }
  }

  /**
   * Remove an email either at a specified index, or by a string.
   * If the email is not found, no failure is thrown. It returns 
   * the account object.
   * @param user 
   * @param email 
   */
  static removeEmail(user:IUserAccount, email: string | number): IUserAccount {
    let index = email as number;
    if (typeof email === 'string') {
      index = user.emails.findIndex((val: SecondaryEmail) => val.email === email as string);
    }

    if (typeof index !== 'number' || index < 0) return { ... user };

    let obj = {... UserAccount.fromObject(user) , emails: Array.from(user.emails) };
        obj.emails.splice(index, 1);
    return obj;
  }

  /**
   * Create a reset token on a user account
   * @param user 
   */
  static createReset(user: IUserAccount): IUserAccount {
    let obj = { ... UserAccount.fromObject(user), emails: Array.from(user.emails || []) };
        obj.reset = new ExpireableToken(obj.primaryEmail);
    return obj;
  }

  /**
   * Attempt to validate a token against an account's password reset
   * @param user 
   * @param token 
   * @throws When token is invalid
   */
  static applyReset(user: IUserAccount, token: string): IUserAccount {
    if (user.reset == null)
      throw new Error('Reset does not exist on object');

    if (ExpireableToken.validateStrings(user.reset, token) === false) 
      throw new Error('Token does not align with reset token');

    let obj = { ... UserAccount.fromObject(user), emails: Array.from(user.emails || []) };
    delete obj.reset;
    return obj;
  }

  /**
   * Either set a new email as the primary email, or set the primary
   * email to the one in the emails field at index obj
   * 
   * This does not add the email to the known emails
   * @param user 
   * @param obj 
   * @throws No email to set
   */
  static setPrimaryEmail(user: IUserAccount, obj: string | number): IUserAccount {
    let primaryEmail = obj as string;
    let emails = Array.from(user.emails);

    if (typeof obj === 'number') {
      let em = emails[obj];
      if (em == null) throw new Error(`Index ${obj} is out of bounds; Email at user.emails at index is undefined.`);

      primaryEmail = user.emails[obj].email;
    }


    if (primaryEmail == null) throw new Error('No email to set');

    return { ... UserAccount.fromObject(user), emails, primaryEmail };
  }

  /**
   * Forcefully set a password on a user account
   * @param user 
   * @param pwd 
   */
  static async setPassword(user: IUserAccount, pwd: string | null): Promise<IUserAccount> {
    return { 
      ... UserAccount.fromObject(user),
      password: pwd == null ? undefined : await Password.create(pwd),
    };
  }

  /**
   * Force a status on a user account
   * @param user 
   * @param status 
   */
  static forceStatus(user: IUserAccount, status: AccountStatus): IUserAccount {
    if (statusKeys.indexOf(status) === -1)
      throw new Error(`Invalid status key ${status}. Valid keys are ${statusKeys.join(', ')}`);
    return {... UserAccount.fromObject(user), status };
  }

  /**
   * Set a user account to locked
   * @param user 
   */
  static deactivate(user: IUserAccount): IUserAccount {
    return { ... UserAccount.fromObject(user), status: 'locked' };
  }

  /**
   * Set a user account to active
   * @param user 
   */
  static reactivate(user: IUserAccount): IUserAccount {
    return { ... UserAccount.fromObject(user), status: 'active' };
  }

  /**
   * Creates an IUserAccount, setting only the primaryEmail 
   * and the password. The account status is derived from 
   * UserAccount.DefaultStatus.
   * @param email 
   * @param password 
   */
  static async create(email: string, password?: string): Promise<IUserAccount> {
    let obj: IUserAccount = {
      primaryEmail: email,
      status: UserAccount.DefaultStatus,
      emails: [],
    }
    if (password) obj.password = await Password.create(password)

    return obj;
  }

  /**
   * Create a user account and start the activation process.
   * @param email 
   * @param password 
   */
  static async register(email: string, password?: string): Promise<IUserAccount> {
    let obj = await UserAccount.create(email, password);
        obj = UserAccount.createActivation(obj);
        obj = UserAccount.forceStatus(obj, 'activation');
    return obj;
  }

  /**
   * Attempt password validation on an active user whose password is not null.
   * @param acc 
   * @param password 
   */
  static async login(acc: IUserAccount, password: string) {
    if (acc.status !== 'active') 
      throw new Error('Account with non-active status attempting login');

    if (acc.password == null)
      throw new Error('User has nullified password');
    
    return Password.validate(acc.password!, password);
  }

  /**
   * Create a new UserAccount instance from an IUserAccount.
   * Also can be used for immutability-respecting clone ops
   * @param obj 
   */
  static fromObject(obj: IUserAccount): UserAccount {
    let acc = new UserAccount(
      obj.primaryEmail, 
      { ... obj.password } as IPassword,
      obj.status, 
      obj.username
    );
    ([ 'activation', "reset" ] as (keyof IUserAccount)[])
      .forEach(key => acc[key] = obj[key]);
    acc.emails = Array.from(obj.emails || [])
    if (acc.emails.length > 0) acc.emails = acc.emails.map(obj => ({ ... obj }));

    return acc;
  }

  /** 
   * Internal constructor. Do not use this unless you've read the file and
   * understand what the constructor is actually doing.
   */
   protected constructor(
    public primaryEmail: string,
    public password: IPassword | undefined,
    public status: AccountStatus = 'activation',
    public username?: string,
  ) { 
    this.emails = []; 
  }

  /**
   * Create an activation token on this object
   */
  createActivation() {
    this.activation = new ExpireableToken(this.primaryEmail);
    return this.activation;
  }

  /**
   * Attempt to activate this user account
   * @param token 
   */
  activate(token: string) {
    if (this.activation == null) 
      throw new Error('Unable to activate object. Activation token does not exist on object');
    
    if (ExpireableToken.validateStrings(this.activation, token) === false)
      throw new Error('Invalid token provided for activation');
    
    delete this.activation;
  }

  /**
   * Add an email to the emails array
   * @param email 
   * @param label 
   */
  addEmail(email: string, label?: string) {
    if (typeof email !== 'string')
      throw new TypeError('Email needs to be of type string');
    this.emails.push(new SecondaryEmail(email, label));
  }

  /**
   * Remove an email from the emails array either via an exact string
   * or an index (if known)
   * @param email 
   */
  removeEmail(email: string | number) {
    let index = email as number;
    if (typeof email === 'string') {
      index = this.emails.findIndex((val: SecondaryEmail) => val.email === email);
    }
    if (typeof index !== 'number' || index < 0) return;

    this.emails.splice(index, 1);
  }

  /**
   * Create a new reset token on this user object
   */
  createReset() {
    this.reset = new ExpireableToken(this.primaryEmail);
  }

  /**
   * Attempt to validate a token against the reset token on this object
   * @param token 
   */
  applyReset(token: string) {
    if (this.reset == null)
      throw new Error('Reset on this instance is undefined. Nothing to validate against');

    if (ExpireableToken.validateStrings(this.reset, token) === false)
      throw new Error('Token does not align with the reset token')

    delete this.reset;
  }

  /**
   * Set the primary email on this object either via a raw string 
   * or by looking up one of the stored emails. 
   * 
   * This does not add the email to the known emails
   * @param obj 
   */
  setPrimaryEmail(obj: string | number) {
    if (typeof obj === 'number') {
      let email = this.emails[obj];
      if (email == null) 
        throw new Error('No email at index ' + obj);

      this.primaryEmail = this.emails[obj].email;
      return;
    }
    if (typeof obj !== 'string')
      throw new Error('Invalid type for primary email. String required, got: ' + typeof obj);
    this.primaryEmail = obj;
  }

  /**
   * Force a password on this user object
   * @param pwd 
   */
  async setPassword(pwd?: string) {
    this.password = pwd == null ? undefined : await Password.create(pwd);
  }

  /**
   * Force a status on this user object
   * @param status 
   */
  forceStatus(status: AccountStatus) {
    if(statusKeys.indexOf(status) === -1)
      throw new Error('Unable to set invalid status.');
    this.status = status;
  }

  /**
   * Set this user object's status to locked
   */
  deactivate() {
    this.status = 'locked';
  }

  /**
   * Set this user object's status to active
   */
  reactivate() {
    this.status = 'active'
  }

  /**
   * Attempt a login on this account
   * @param pwd 
   */
  login(pwd: string) {
    return UserAccount.login(this, pwd);
  }
}
