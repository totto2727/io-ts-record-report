import { array, option, record } from "fp-ts";
import { fold, isRight } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { foldW, Option } from "fp-ts/lib/Option";
import { not } from "fp-ts/lib/Predicate";
import { isEmpty } from "fp-ts/lib/string";
import * as t from "io-ts";
import { withMessage } from "io-ts-types";

const getPath = (error: t.ValidationError) =>
  error.context
    .map(({ key }) => key)
    .filter(not(isEmpty))
    .join(".");

const getReportRecord = <A>(
  v: t.Validation<A>
): Partial<Record<string, Option<string>>> => {
  return pipe(
    v,
    fold(
      array.map(
        (x) =>
          [
            getPath(x),
            pipe(x.message ?? "", option.fromPredicate(not(isEmpty))),
          ] as const
      ),
      () => []
    ),
    Object.fromEntries
  );
};

export const viewErrorMessage = (
  message: Option<string> | undefined,
  empty = "error"
): string | undefined => {
  if (message) {
    return pipe(
      message,
      foldW(
        () => empty,
        (x) => x
      )
    );
  }
  return message;
};

class Validator<A extends t.Props> {
  private _codec: t.TypeC<A>;
  private _validation: t.Validation<t.TypeOf<t.TypeC<A>>> | undefined;

  constructor(codec: t.TypeC<A>) {
    this._codec = codec;
  }

  validate = (x: unknown): x is t.TypeOf<t.TypeC<A>> => {
    this._validation = this._codec.decode(x);
    return isRight(this._validation);
  };

  get error() {
    if (this._validation) return getReportRecord(this._validation);
    else return {};
  }
}

const records = [
  {
    a: "",
    b: 1,
  },
  {
    a: undefined,
    b: "1",
  },
];

const main = () => {
  const codec = t.type({
    a: t.string,
    b: withMessage(t.number, () => "not number"),
  });

  const typeChecker = new Validator(codec);
  records.forEach((x) => {
    console.log(x);
    console.log(typeChecker.validate(x));
    console.log(typeChecker.error);
    console.log(record.map(viewErrorMessage)(typeChecker.error));
    console.log("\n");
  });
};

main();
