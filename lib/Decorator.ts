import {
  ValidItem, ValidNumberOption, ValidObjectOption, ValidStringOption,
} from './Validator';

export function Valid():ClassDecorator {
  return (target) => {
    // console.log(target.prototype.__validData)
  };
}

function _initValid(target: any): ValidItem[] {
  if (!target.__validData) {
    target.__validData = [];
  }
  return target.__validData;
}

export function ValidString(option?: ValidStringOption):PropertyDecorator {
  return (target, key) => {
    const validData = _initValid(target);
    validData.push({
      name: key.toString(), option: option ?? {}, type: 'string',
    });
  };
}

export function ValidObject(option: ValidObjectOption):PropertyDecorator {
  return (target, key) => {
    const validData = _initValid(target);
    validData.push({
      name: key.toString(), option, type: 'object',
    });
  };
}

export function ValidNumber(option?: ValidNumberOption):PropertyDecorator {
  return (target, key) => {
    const validData = _initValid(target);
    validData.push({
      name: key.toString(), option: option ?? {}, type: 'number',
    });
  };
}
