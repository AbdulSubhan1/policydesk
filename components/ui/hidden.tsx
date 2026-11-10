/** Hidden form value, e.g. the id a server action works on. */
export function Hidden({ name, value }: { name: string; value: string | number }) {
  return <input data-ui="Hidden" type="hidden" name={name} value={value} />;
}
