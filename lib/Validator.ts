import { ValidationError } from './Error';

export interface ValidItem {
    name: string;
    type: string;
    option: any;
}

export interface ValidStringOption {
    min?: number;
    max?: number;
}

export interface ValidObjectOption {
    valid: any
}

export interface ValidArrayOption {
    valid: any,
    min?: number
    max?: number
}

export interface ValidNumberOption {
    min?: number;
    max?: number;
}

function ValidateString(v: unknown, name: string, option: ValidStringOption): string {
  if (typeof v === 'number') {
    v = v.toString();
  }
  if (typeof v !== 'string') {
    throw new ValidationError(`Valid error: '${name}' is not a string`);
  }
  if (typeof option.min === 'number') {
    if (v.length < option.min) {
      throw new ValidationError(`Valid error: string '${name}' length is less than ${option.min}`);
    }
  }
  if (typeof option.max === 'number') {
    if (v.length > option.max) {
      throw new ValidationError(`Valid error: string '${name}' length is big than ${option.max}`);
    }
  }
  return v;
}

function ValidateNumber(v: unknown, name: string, option: ValidStringOption): number {
  if (typeof v === 'string') {
    v = Number(v);
  }
  if (typeof v !== 'number') {
    throw new ValidationError(`Valid error: '${name}' is not a number`);
  }
  return v;
}

export function Validate(v: unknown, name: string, items: ValidItem[]): unknown {
  if (v === null || v === undefined) {
    throw new ValidationError(`Valid error: '${name}' is miss`);
  }
  if (typeof v !== 'object') {
    throw new ValidationError(`Valid error: '${name}' is not a object`);
  }
  const d = {};
  for (const item of items) {
    const value = v[item.name];
    if (item.type === 'string') {
      d[item.name] = ValidateString(value, item.name, item.option);
    } else if (item.type === 'number') {
      d[item.name] = ValidateNumber(value, item.name, item.option);
    } else if (item.type === 'object') {
      if (item.option.valid && item.option.valid.prototype.__validData) {
        Validate(value, item.name, item.option.valid.prototype.__validData);
      }
    }
  }
  return d;
}

type ValidatorFunction = (v:unknown)=>void

class ValidatorType {
  // eslint-disable-next-line no-unused-vars
  validate(v:unknown):void {
  }
}

class ValidatorString extends ValidatorType {
  validateList:ValidatorFunction[] = [];

  min(size:number) {
    this.validateList.push(((v) => {
      if (typeof v === 'string' && v.length < size) {
        throw new ValidationError();
      }
    }));
    return this;
  }

  max(size:number) {
    this.validateList.push(((v) => {
      if (typeof v === 'string' && v.length > size) {
        throw new ValidationError();
      }
    }));
    return this;
  }

  validate(v: unknown) {
    for (const validateFun of this.validateList) {
      validateFun(v);
    }
  }
}

export class Validator {
  static string() {
    return new ValidatorString();
  }
}
