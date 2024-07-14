import {
  ProcedureParamDecorator,
  ProcedureParamDecoratorType,
} from '../interfaces/factory.interface';
import { PROCEDURE_PARAM_METADATA_KEY } from '../trpc.constants';

export function Input(key?: string): ParameterDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const existingParams: Array<ProcedureParamDecorator> =
      Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, target, propertyKey) ||
      [];

    const procedureParamMetadata: ProcedureParamDecorator = {
      type: ProcedureParamDecoratorType.Input,
      index: parameterIndex,
      key,
    };
    existingParams.push(procedureParamMetadata);
    Reflect.defineMetadata(
      PROCEDURE_PARAM_METADATA_KEY,
      existingParams,
      target,
      propertyKey,
    );
  };
}