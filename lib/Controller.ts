import { IncomingMessage } from 'node:http'
import { match, MatchFunction } from 'path-to-regexp'

interface RequestMethodMetadataRaw {
    path: string;
    funName: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
}

export interface ControllerMetadataRaw {
    target: any,
    prefix: string;
    disabled: boolean,
    methodMap: Record<string | symbol, RequestMethodMetadataRaw>
}

function getControllerMetadata (target: any): ControllerMetadataRaw {
  if (!(target in controllerMetadataMap)) {
    controllerMetadataMap[target] = {
      target,
      prefix: '',
      disabled: true,
      methodMap: {}
    }
  }
  return controllerMetadataMap[target]
}

function getMethodMetadata (target: any, key: string | symbol): RequestMethodMetadataRaw {
  const routerMetadata = getControllerMetadata(target)
  if (!(key in routerMetadata.methodMap)) {
    routerMetadata.methodMap[key] = {
      path: '',
      funName: key.toString(),
      method: 'GET'
    }
  }
  return routerMetadata.methodMap[key]
}

const controllerMetadataMap: Record<any, ControllerMetadataRaw> = {}

interface ControllerOption {
    prefix?: string;
    disabled?: boolean;
}

export function Controller (option: ControllerOption): ClassDecorator {
  return target => {
    const controller = getControllerMetadata(target.prototype)
    controller.disabled = option.disabled ?? false
    controller.prefix = option.prefix ?? ''
  }
}

export interface RequestMethodOption {
    path?: string
}

export function Get (option: RequestMethodOption = {}): PropertyDecorator {
  return (target: any, propertyKey) => {
    const m = getMethodMetadata(target, propertyKey)
    m.path = option.path ?? propertyKey.toString()
    m.method = 'GET'
  }
}

export function isExistController (target: any) {
  return target in controllerMetadataMap
}

export interface RequestContext {
    body: unknown;
    param:Record<string, string>
}

export interface RequestMethod {
    path: string;
    match: MatchFunction,
    validator: (req: IncomingMessage) => void,
    target: (req: IncomingMessage, param:Record<string, string>) => Promise<unknown>
}

export function build (clazz: any, target: any): RequestMethod[] {
  const metadata = controllerMetadataMap[target]
  const list: RequestMethod[] = []
  if (metadata.disabled) {
    return []
  }
  for (const key in metadata.methodMap) {
    const m = metadata.methodMap[key]
    const fullPath = `${metadata.prefix}${m.path}`
    const validScript: string = ''
    // @ts-ignore
    // eslint-disable-next-line no-new-func
    const validFun: (req: IncomingMessage) => void = new Function('req', validScript)
    console.log(fullPath)
    list.push({
      match: match(fullPath),
      path: fullPath,
      validator: validFun,
      target: async (req, par:Record<string, string>) => {
        const ctx: RequestContext = {
          body: {},
          param: par
        }
        return await clazz[m.funName](ctx)
      }
    })
  }
  return list
}
