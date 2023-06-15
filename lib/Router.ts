import 'reflect-metadata'
type MethodParameterMetadataRaw = MethodParameterParamterMetadataRaw
interface MethodParameterParamterMetadataRaw {
  index: number
  type: 'parameter'
  name: string
  required: boolean
  default: unknown
}

interface RequestMethodMetadataRaw {
  path?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  parameter: MethodParameterMetadataRaw[]
}

export interface RouteMetadataRaw {
  target: any
  methodMap: Record<string | symbol, RequestMethodMetadataRaw>
}

function getRouteMetadata (target: any): RouteMetadataRaw {
  if (!(target in metadataMap)) {
    metadataMap[target] = {
      target,
      methodMap: {}
    }
  }
  return metadataMap[target]
}

function getMethodMetadata (target: any, key: string | symbol): RequestMethodMetadataRaw {
  const routerMetadata = getRouteMetadata(target)
  if (!(key in routerMetadata.methodMap)) {
    routerMetadata.methodMap[key] = {
      parameter: []
    }
  }
  return routerMetadata.methodMap[key]
}

const metadataMap: Record<any, RouteMetadataRaw> = {}

export function Router (): ClassDecorator {
  return target => {
    console.log(JSON.stringify(metadataMap[target.prototype]))
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

export interface ParameterOption {
  name: string
  required?: boolean
  default?: unknown
}

export function Parameter (option: string | ParameterOption): ParameterDecorator {
  const o = typeof option === 'string' ? { name: option } : option
  return (target, propertyKey: string | symbol, parameterIndex) => {
    const m = getMethodMetadata(target, propertyKey)
    const t = Reflect.getMetadata('design:type', target, propertyKey)
    console.log(t.name)
    m.parameter[parameterIndex] = {
      index: parameterIndex,
      type: 'parameter',
      name: o.name,
      default: true,
      required: true
    } satisfies MethodParameterParamterMetadataRaw
  }
}

export interface QueryOption {
  name: string
}

export function Query (option: string | QueryOption) {
  return (target: any, context: string) => {
    console.log(context)
  }
}
