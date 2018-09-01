export interface ISecondaryEmail {
  email: string;
  label?: string;
  added: Date
}

export class SecondaryEmail implements ISecondaryEmail {
  added: Date;
  constructor(public email: string, public label?: string) {
    this.added = new Date();
  }
}