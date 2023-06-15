export type ControllerRouteParamType = 'header'|'body'|'context'|'data'|'unknown'|'query'|'param'
export interface ControllerRouteParam {
    name: string;
    type: ControllerRouteParamType;
    option: any;
}

export interface ControllerRoute {
    path: string;
    name: string;
    method: 'get' | 'post',
    param: ControllerRouteParam[]
}

export interface ControllerMetadata {
    path: string;
    routes: ControllerRoute[]
}

export interface ComponentMetadata {
    type: 'service' | 'controller' | 'requestPlugin' | 'null',
    name: string;
    controllerInfo: ControllerMetadata;
    injectList: {
        fieldName: string;
        targetName: string;
    }[]
}

export function GetComponentMetadata(target: any): ComponentMetadata {
  if (!target.__component) {
    // eslint-disable-next-line no-param-reassign
    target.__component = {
      type: 'null',
      name: '',
      injectList: [],
      controllerInfo: {
        path: '',
        routes: [],
      },
    } as ComponentMetadata;
  }
  return target.__component;
}
