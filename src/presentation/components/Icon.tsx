import type { SVGProps } from 'react';

export type IconName =
  | 'task'
  | 'focus'
  | 'routine'
  | 'break'
  | 'carried'
  | 'anchor'
  | 'warning'
  | 'storage'
  | 'share'
  | 'clock';

export const ICON_LABEL: Record<IconName, string> = {
  task: 'Task',
  focus: 'Focus',
  routine: 'Routine',
  break: 'Break',
  carried: 'Carried over',
  anchor: 'Anchored',
  warning: 'Warning',
  storage: 'On this iPhone',
  share: 'Share',
  clock: 'Time',
};

/**
 * A same-origin SVG sprite icon.
 *
 * A decorative icon is hidden from assistive technology; a meaningful icon
 * needs a `title`, which gives it `role="img"` and a name. Type icons are
 * always paired with visible text so a block type is never colour-only.
 */
export function Icon({
  name,
  size = 16,
  title,
  ...props
}: { name: IconName; size?: number; title?: string } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  const decorative = !title;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <use href={`${import.meta.env.BASE_URL}icons/sprite.svg#icon-${name}`} />
    </svg>
  );
}
