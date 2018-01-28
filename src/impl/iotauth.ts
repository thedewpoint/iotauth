import * as IOTA from 'iota.lib.js';
import * as moment from 'moment';
import { IIotAuth } from '../api/iotauth-api';
export class IotAuth implements IIotAuth {
  public readonly iotaClient: any;
  private receiveSeed: string;
  private duration: number;
  constructor(
    seed?: string,
    duration: number = Infinity,
    node: string = 'https://nodes.iota.cafe'
  ) {
    this.iotaClient = new IOTA({
      provider: node,
    });
    if (seed) {
      this.receiveSeed = seed;
    }
    this.duration = duration;
  }
  public async isTransactionValid(validationCode?: string): Promise<boolean> {
    try {
      const receiveSeed = await this.getSeed();
      const accountData: any = await this.getAccountData(receiveSeed);
      const transferObj = accountData.transfers.pop();
      const transfer = transferObj[0];
      const previousAddresses = accountData.transfers.map(
        (myTransfer: any) => myTransfer[0].address
      );
      let code = this.iotaClient.utils.extractJson(transferObj);
      code = JSON.parse(code);
      const isValidAddress =
        (await this.isValidAddress(
          transfer.address,
          accountData.transfers.length - 1
        )) && !previousAddresses.includes(transfer.address);
      const isValidTimestamp = this.isValidTimestamp(transfer.timestamp);
      return (
        ((code && code.code === validationCode) || !validationCode) &&
        isValidAddress &&
        isValidTimestamp
      );
    } catch (e) {
      return false;
    }
  }
  public async getSeed(): Promise<string> {
    if (!this.receiveSeed) {
      // this.receiveSeed = await this.generateNewSeed();
      throw new Error('no seed');
    }
    return this.receiveSeed;
  }
  // public async generateValidationCode(): Promise<string> {
  //   const seed: string = await iotaSeed();
  //   return seed.slice(0, 6);
  // }
  private async getNewAddresses(
    seed: string,
    options: any = { index: 0, returnAll: true }
  ): Promise<string[]> {
    return new Promise<string[]>(resolve => {
      this.iotaClient.api.getNewAddress(
        seed,
        options,
        (empty: any, addresses: string[], transactions: any[]) => {
          resolve(addresses);
        }
      );
    });
  }

  private async isValidAddress(
    receiveAddress: string,
    index: number
  ): Promise<boolean> {
    const correctAddresses = await this.getNewAddresses(this.receiveSeed, {
      index,
      returnAll: true,
    });
    return correctAddresses.includes(receiveAddress);
  }
  private isValidTimestamp(timestamp: number): boolean {
    const transactionTime: moment.Moment = moment(timestamp * 1000);
    const now: moment.Moment = moment();
    const diff: number = now.diff(transactionTime, 'minutes');
    return diff <= this.duration;
  }
  // private async generateNewSeed(): Promise<string> {
  //   const seed: string = await iotaSeed();
  //   return seed;
  // }

  private async getAccountData(seed: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.iotaClient.api.getAccountData(
        seed,
        (error: any, accountData: any) => {
          resolve(accountData);
        }
      );
    });
  }
}
