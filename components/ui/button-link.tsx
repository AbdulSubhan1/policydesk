import Link from "next/link";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./styles";

type Props = React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

/** A link that looks like a button. */
export function ButtonLink({ variant, size, className, ...props }: Props) {
  return <Link data-ui="ButtonLink" className={buttonClass(variant, size, className)} {...props} />;
}
