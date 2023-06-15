import Router from 'koa-router';
import { Validate } from './Validator';
import {
  ComponentMetadata, ControllerRoute, ControllerRouteParamType, GetComponentMetadata,
} from './Component';

export class ControllerResponse {
  type: string;

  body: unknown;

  static CustomResponse(type: string, body: unknown) {
    const r = new ControllerResponse();
    r.type = type;
    r.body = body;
    return r;
  }
}

export interface RequestBodyOption {
    valid?: any;
}

export interface RequestQueryOption {
    valid?: any;
}

export function GenRouter(prefix: string, controller: any, metadata: ComponentMetadata): Router {
  const router = new Router();
  for (const route of metadata.controllerInfo.routes) {
    const path = prefix + metadata.controllerInfo.path + route.path;
    console.log(`[${route.method}]`, path);
    router[route.method](path, async (ctx) => {
      const param = [];
      for (const p of route.param) {
        if (p.type === 'body') {
          const v = p.option.valid && p.option.valid.prototype.__validData
            ? Validate(ctx.request.body, 'RequestBody', p.option.valid.prototype.__validData)
            : ctx.request.body;
          param.push(v);
        } else if (p.type === 'header') {
          param.push(ctx.header);
        } else if (p.type === 'query') {
          const v = p.option.valid && p.option.valid.prototype.__validData
            ? Validate(ctx.query, 'RequestBody', p.option.valid.prototype.__validData)
            : ctx.query;
          param.push(v);
        } else if (p.type === 'param') {
          param.push(ctx.params);
        } else if (p.type === 'context') {
          param.push(ctx);
        } else if (p.type === 'data') {
          param.push(ctx[p.option.name]);
        } else {
          param.push({});
        }
      }
      const res = (await controller[route.name](...param));
      if (res) {
        if (res instanceof ControllerResponse) {
          ctx.type = res.type;
          ctx.response.body = res.body;
        } else {
          ctx.response.body = res;
        }
      }
    });
  }
  return router;
}

interface ControllerOption {
    path?: string;
    disabled?: boolean;
}

interface RequestOption {
    path?: string;
}

const controllers: ComponentMetadata[] = [];

export function Controller(option: ControllerOption): ClassDecorator {
  return (target: any) => {
    const controller = GetComponentMetadata(target.prototype);
    controller.type = 'controller';
    controller.controllerInfo.path = option.path;
    controller.name = target.prototype.constructor.name;
    if (option.disabled) {
      controllers.push(controller);
    }
  };
}

function _addRoute(type: 'get' | 'post', target: any, name: string, desc: unknown, option?: RequestOption) {
  const controller = GetComponentMetadata(target);
  Object.defineProperty(target, name, desc);
  let d = controller.controllerInfo.routes.find((s) => s.name === name);
  if (!d) {
    d = {
      name: '',
      path: '',
      method: 'get',
      param: [],
    };
    controller.controllerInfo.routes.push(d);
  }
  const p = option?.path ?? name.replace(/[A-Z]/g, (t) => `_${t.toLowerCase()}`);
  d.name = name;
  d.path = p.startsWith('/') ? p : (`/${p}`);
  d.method = type;
}

function _addRouteParam(target: any, name: string, desc, type: ControllerRouteParamType, option: any) {
  const controller = GetComponentMetadata(target);
  let route: ControllerRoute = null;
  const t = controller.controllerInfo.routes.find((s) => s.name === name);
  if (!t) {
    route = {
      name,
      path: name,
      method: 'get',
      param: [],
    };
    controller.controllerInfo.routes.push(route);
  } else {
    route = t;
  }
  for (let i = route.param.length; i < desc + 1; i++) {
    route.param.push({
      type: 'unknown', name: '', option: {},
    });
  }
  route.param[desc] = { type, name, option: option ?? {} };
}

export function GetMapping(p?: RequestOption): MethodDecorator {
  return (target: any, name: string, desc: unknown) => {
    _addRoute('get', target, name, desc, p);
  };
}

export function PostMapping(p?: RequestOption): MethodDecorator {
  return (target: any, name: string, desc: unknown) => {
    _addRoute('post', target, name, desc, p);
  };
}

export function RequestBody(option?: RequestBodyOption): ParameterDecorator {
  return (target: any, name: string, desc) => {
    if (typeof desc !== 'number') {
      throw new Error('invalid @Body');
    }
    _addRouteParam(target, name, desc, 'body', option);
  };
}

export function RequestQuery(option?: RequestQueryOption): ParameterDecorator {
  return (target: any, name: string, desc) => {
    if (typeof desc !== 'number') {
      throw new Error('invalid @Body');
    }
    _addRouteParam(target, name, desc, 'query', option);
  };
}

export function RequestParam(): ParameterDecorator {
  return (target: any, name: string, desc) => {
    if (typeof desc !== 'number') {
      throw new Error('invalid @Body');
    }
    _addRouteParam(target, name, desc, 'param', {});
  };
}

export function RequestData(dataName: string): ParameterDecorator {
  return (target, name: string, desc) => {
    if (typeof desc !== 'number') {
      throw new Error('invalid @Body');
    }
    _addRouteParam(target, name, desc, 'data', { name: dataName });
  };
}

export function RequestHeader(): ParameterDecorator {
  return (target: any, name: string, desc) => {
    if (typeof desc !== 'number') {
      throw new Error('invalid @Body');
    }
    _addRouteParam(target, name, desc, 'header', {});
  };
}

export function RequestContext(): ParameterDecorator {
  return (target: any, name: string, desc) => {
    if (typeof desc !== 'number') {
      throw new Error('invalid @Body');
    }
    _addRouteParam(target, name, desc, 'context', {});
  };
}

export function RequestPlugin(): ClassDecorator {
  return (target: any) => {
    const controller = GetComponentMetadata(target.prototype);
    controller.type = 'requestPlugin';
    controller.name = target.prototype.constructor.name;
  };
}

export class RequestPluginClass {
  async handle(ctx, next) {
    /** null* */
  }
}
