import { buttonClass, type ButtonSize, type ButtonVariant } from "./styles";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, ...props }: Props) {
  return <button data-ui="Button" className={buttonClass(variant, size, className)} {...props} />;
}
