import { Injectable } from '@nestjs/common';
import { ModulesContainer, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { ZodSchema } from 'zod';
import {
  PROCEDURE_METADATA_KEY,
  PROCEDURE_TYPE_KEY,
  ROUTER_METADATA_KEY,
} from './trpc.constants';
import { Procedure } from './trpc.enum';

interface ProcedureMetadata {
  type: Procedure;
  input: ZodSchema | undefined;
  output: ZodSchema | undefined;
  name: string;
  implementation: ({ input }) => any;
}

@Injectable()
export class TrpcFactory {
  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  getRouters() {
    const routers = [];
    this.modulesContainer.forEach((moduleRef) => {
      moduleRef.providers.forEach((wrapper: InstanceWrapper) => {
        const { instance, name } = wrapper;
        if (!instance) {
          return undefined;
        }

        const router = Reflect.getMetadata(
          ROUTER_METADATA_KEY,
          instance.constructor,
        );

        if (router != null) {
          routers.push({ name, instance, options: router });
        }
      });
    });

    return routers;
  }

  getProcedures(instance, prototype): Array<ProcedureMetadata> {
    const procedures = this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (name) => {
        const callback = prototype[name];
        const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
        const { input, output } = Reflect.getMetadata(
          PROCEDURE_METADATA_KEY,
          callback,
        );

        return {
          type,
          input,
          name: callback.name,
          output,
          implementation: callback,
        };
      },
    );

    return procedures;
  }

  generateSchema(router, mergeRoutes, publicProcedure): Record<string, any> {
    const routers = this.getRouters();
    console.log(routers);
    const routerSchema = routers.map((route) => {
      const { instance } = route;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.getProcedures(instance, prototype);

      const producersSchema = procedures.reduce((obj, producer) => {
        obj[producer.name] = publicProcedure.query(({ input }) =>
          // Call the method on the instance with proper dependency injection handling
          instance[producer.name](input),
        );
        return obj;
      }, {});

      return router(producersSchema);
    });

    return mergeRoutes(...routerSchema);
  }
}