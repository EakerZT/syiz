import { IncomingMessage } from 'node:http'
import { match, MatchFunction } from 'path-to-regexp'
import { ValidatorType } from './Validator'

type HttpRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface RequestMethodMetadataRaw {
    path: string;
    funName: string;
    body?: ValidatorType;
    method: HttpRequestMethod
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
    path?: string;
    body?: ValidatorType;
}

function _RequestMapping (method: HttpRequestMethod, option: RequestMethodOption = {}): PropertyDecorator {
  return (target: any, propertyKey) => {
    const m = getMethodMetadata(target, propertyKey)
    m.path = option.path ?? propertyKey.toString()
    m.method = method
    m.body = option.body
  }
}

export function Get (option: RequestMethodOption = {}): PropertyDecorator {
  return _RequestMapping('GET', option)
}

export function Post (option: RequestMethodOption = {}): PropertyDecorator {
  return _RequestMapping('POST', option)
}

export function Put (option: RequestMethodOption = {}): PropertyDecorator {
  return _RequestMapping('PUT', option)
}

export function Delete (option: RequestMethodOption = {}): PropertyDecorator {
  return _RequestMapping('DELETE', option)
}

export function isExistController (target: any) {
  return target in controllerMetadataMap
}

export interface RequestContext {
    body: unknown;
    param: Record<string, string>;
}

export interface RequestMethod {
    path: string;
    method: HttpRequestMethod,
    urlValidator: MatchFunction,
    bodyValidator: (req: IncomingMessage) => void,
    target: (req: IncomingMessage, param: Record<string, unknown>) => Promise<unknown>
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
      urlValidator: match(fullPath),
      path: fullPath,
      method: m.method,
      bodyValidator: validFun,
      target: async (req, par: Record<string, string>) => {
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
