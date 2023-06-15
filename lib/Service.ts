import { GetComponentMetadata } from './Component';

interface ServiceOption {
    name?: string
}

export class ServiceClass {
  async init(): Promise<void> {
    /* null */
  }
}

export function Service(option?: ServiceOption): ClassDecorator {
  return (target: any) => {
    const service = GetComponentMetadata(target.prototype);
    service.type = 'service';
    service.name = option?.name ?? target.prototype.constructor.name.replace(/^\S/, (s) => s.toLowerCase());
  };
}

interface AutowiredOption {
    name?: string;
}

export function Autowired(option?: AutowiredOption): PropertyDecorator {
  return (target, key) => {
    const serviceMetadata = GetComponentMetadata(target);
    serviceMetadata.injectList.push({
      fieldName: key.toString(), targetName: option?.name ?? key.toString(),
    });
  };
}
