import { BadRequestException, createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const QueryRequired = createParamDecorator((key: string, ctx: ExecutionContext) => {
	const req = ctx.switchToHttp().getRequest();

	const value = req.query[key];

	if (value === undefined) {
		throw new BadRequestException(`Missing required query param: '${key}'`);
	}

	return value;
});
