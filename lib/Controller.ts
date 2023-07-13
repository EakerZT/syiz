import { IncomingMessage } from 'node:http'
import { match, MatchFunction } from 'path-to-regexp'
import { ValidatorType } from './Validator'

type HttpRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface RequestMethodParameterMetadataRawBody {
    type: 'body'
}

interface RequestMethodParameterMetadataRawQuery {
    type: 'query',
    name: string;
}

interface RequestMethodParameterMetadataRawParam {
    type: 'param',
    name: string;
}

type RequestMethodParameterMetadataRaw =
    RequestMethodParameterMetadataRawBody
    | RequestMethodParameterMetadataRawQuery
    | RequestMethodParameterMetadataRawParam

interface RequestMethodMetadataRaw {
    path: string;
    funName: string;
    body?: ValidatorType;
    method: HttpRequestMethod,
    params: Array<RequestMethodParameterMetadataRaw | undefined>;
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
      method: 'GET',
      params: []
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

function _RequestMapping (method: HttpRequestMethod, option: RequestMethodOption = {}): MethodDecorator {
  return (target: any, propertyKey, descriptor:TypedPropertyDescriptor<any>) => {
    const m = getMethodMetadata(target, propertyKey)
    m.path = option.path ?? propertyKey.toString()
    m.method = method
    m.body = option.body
  }
}

export function Get (option: RequestMethodOption = {}): MethodDecorator {
  return _RequestMapping('GET', option)
}

export function Post (option: RequestMethodOption = {}): MethodDecorator {
  return _RequestMapping('POST', option)
}

export function Put (option: RequestMethodOption = {}): MethodDecorator {
  return _RequestMapping('PUT', option)
}

export function Delete (option: RequestMethodOption = {}): MethodDecorator {
  return _RequestMapping('DELETE', option)
}

function addParam (target: Object, propertyKey: string | symbol, parameterIndex: number, option: RequestMethodParameterMetadataRaw) {
  const m = getMethodMetadata(target, propertyKey)
  for (let i = m.params.length; i < parameterIndex + 1; i++) {
    m.params.push(undefined)
  }
  m.params[parameterIndex] = option
}

export function Body (): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    if (!propertyKey) {
      throw new SyntaxError('@Body can in here')
    }
    addParam(target, propertyKey, parameterIndex, { type: 'body' })
  }
}

export function Query (name: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    if (!propertyKey) {
      throw new SyntaxError('@Query can in here')
    }
    addParam(target, propertyKey, parameterIndex, { type: 'query', name: name })
  }
}

export function Param (name: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    if (!propertyKey) {
      throw new SyntaxError('@Param can in here')
    }
    addParam(target, propertyKey, parameterIndex, { type: 'param', name: name })
  }
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
    target: (req: IncomingMessage, param: RequestMethod) => Promise<unknown>
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
    let funScript = ''
    for (const param of m.params) {
      if (!param) {
        funScript += 'value.push(undefined);\n'
      } else if (param.type === 'body') {
        funScript += 'value.push(getBody(req));\n'
      } else if (param.type === 'query') {
        funScript += `value.push(getQuery(req,'${param.name}'));\n`
      } else if (param.type === 'param') {
        funScript += `value.push(getParam(par,'${param.name}'));\n`
      }
    }
    const transFunScript: string = `const value = [];\n${funScript}return value;`
    console.log(fullPath)
    list.push({
      urlValidator: match(fullPath),
      path: fullPath,
      method: m.method,
      bodyValidator: validFun,
      target: async (req, metadata: RequestMethod) => {
        const param = []
        return await clazz[m.funName](...param)
      }
    })
  }
  return list
}
