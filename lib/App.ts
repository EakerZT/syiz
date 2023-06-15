import * as fs from 'fs';
import * as path from 'path';
import Koa from 'koa';
import { Server } from 'http';
import bodyParser from 'koa-body';
import historyApiFallback from 'koa2-connect-history-api-fallback';
import staticFiles = require('koa-static')

import { GenRouter, RequestPluginClass } from './Controller';
import { ComponentMetadata, GetComponentMetadata } from './Component';
import { ServiceClass } from './Service';

interface IRewrites {
    from: string,
    to: string
}

interface HistoryApiFallbackOptions {
    logger?: object
    index?: string | '/default.html'
    whiteList?: string[]
    rewrites?: IRewrites[]
    verbose?: boolean
    htmlAcceptHeaders?: string[]
    disableDotRule?: boolean
}

interface AppOption {
    port?: number;
    routePrefix?: string;
    /**
     * default: true
     */
    staticDir?: boolean;
    /**
     * default: ./static
     */
    staticPath?: string;
    /**
     * historyApiFallback
     */
    historyApiFallback?: HistoryApiFallbackOptions;
}

export default class App {
  koa: Koa;

  option: AppOption;

  componentMap:Record<string, {
    name:string;
    value:any;
    class:any;
    metadata: ComponentMetadata
  }> = {};

  constructor(option?: AppOption) {
    this.koa = new Koa();
    this.option = option ? {
      port: 3000,
      routePrefix: '/',
      staticDir: true,
      staticPath: './static',
      ...option,
    } : {
      port: 3000,
      routePrefix: '/',
      staticDir: true,
      staticPath: './static',
    };
  }

  addMiddleware(middleware: any) {
    this.koa.use(middleware);
  }

  scan(routePath: string) {
    const filenames = fs.readdirSync(routePath);
    for (const filename of filenames) {
      const fullPath = path.join(routePath, filename);
      if (fs.statSync(fullPath).isDirectory()) {
        this.scan(path.join(fullPath));
        // eslint-disable-next-line no-continue
        continue;
      }
      if (!filename.endsWith('.js') && !filename.endsWith('.ts')) {
        // eslint-disable-next-line no-continue
        continue;
      }
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const componentClass = require(fullPath).default;
      if (!componentClass) {
        continue;
      }
      if (!componentClass.prototype) {
        continue;
      }
      if (componentClass && componentClass.prototype.__component && componentClass.prototype.__component.type !== 'null') {
        const metadata = GetComponentMetadata(componentClass.prototype);
        if (metadata.name in this.componentMap) {
          throw new Error(`exist component:${metadata.name}`);
        }
        this.componentMap[metadata.name] = {
          name: metadata.name, value: null, metadata, class: componentClass,
        };
      }
    }
  }

  async start(): Promise<Server> {
    if (this.option.historyApiFallback) {
      this.koa.use(historyApiFallback(this.option.historyApiFallback));
    }
    if (this.option.staticDir) {
      this.koa.use(staticFiles(path.join(process.cwd(), this.option.staticPath)));
    }
    this.koa.use(bodyParser({ multipart: true }));
    const routers = [];
    const plugins: RequestPluginClass[] = [];
    // eslint-disable-next-line consistent-return
    const initComponent = async (name: string, link: string[] = []): Promise<any> => {
      if (!(name in this.componentMap)) {
        throw new Error(`not exist component:${name}`);
      }
      const c = this.componentMap[name];
      if (c.value) {
        return c.value;
      }
      if (c.metadata.injectList.length > 0) {
        for (const i of c.metadata.injectList) {
          if (!(i.targetName in this.componentMap)) {
            throw new Error(`not found component '${i.targetName}' in ${name}::${i.fieldName}`);
          }
          console.log(`[inject] ${i.targetName}->${name}::${i.fieldName}`);
          c.class.prototype[i.fieldName] = await initComponent(i.targetName, [...link, name]);
        }
      }
      // eslint-disable-next-line new-cap
      c.value = new c.class();
      console.log(`[${c.metadata.type}] ${c.name}`);
      if (c.metadata.type === 'controller') {
        const d = GenRouter(this.option.routePrefix, c.value, c.metadata);
        routers.push(d.routes());
      } else if (c.metadata.type === 'requestPlugin' && c.value instanceof RequestPluginClass) {
        plugins.push(c.value);
      }
      if (c.value instanceof ServiceClass) {
        await c.value.init();
      }
      return c.value;
    };
    for (const key of Object.keys(this.componentMap)) {
      await initComponent(key);
    }
    for (const plugin of plugins) {
      this.koa.use((c, n) => plugin.handle(c, n));
    }
    for (const router of routers) {
      this.koa.use(router);
    }
    return this.koa.listen(this.option.port);
  }
}
