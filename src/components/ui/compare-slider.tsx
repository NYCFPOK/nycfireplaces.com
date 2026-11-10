// Installed from 21st.dev (@diceui/compare-slider, MIT) and adapted for this site:
// - the radix-ui Slot wrapper and lucide-react icons are removed, so it adds no dependencies
// - vertical page scrolling still works when a finger lands on the slider (touch-pan-y)
// - a tap or click jumps the divider to that point; colours and focus ring use the site tokens
import * as React from "react";

const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;
function useAsRef<T>(props: T) {
  const ref = React.useRef<T>(props);
  useIsomorphicLayoutEffect(() => {
    ref.current = props;
  });
  return ref;
}
function useLazyRef<T>(fn: () => T) {
  const ref = React.useRef<T | null>(null);
  if (ref.current === null) ref.current = fn();
  return ref as React.RefObject<T>;
}
const Chevron = ({ d }: { d: string }) => (
  <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
);
const ChevronLeftIcon = () => <Chevron d="m15 18-6-6 6-6" />;
const ChevronRightIcon = () => <Chevron d="m9 18 6-6-6-6" />;
const ChevronUpIcon = () => <Chevron d="m18 15-6-6-6 6" />;
const ChevronDownIcon = () => <Chevron d="m6 9 6 6 6-6" />;

const ROOT_NAME = "CompareSlider";
const BEFORE_NAME = "CompareSliderBefore";
const AFTER_NAME = "CompareSliderAfter";
const LABEL_NAME = "CompareSliderLabel";
const HANDLE_NAME = "CompareSliderHandle";

const PAGE_KEYS = ["PageUp", "PageDown"];
const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

type Interaction = "hover" | "drag";
type Orientation = "horizontal" | "vertical";

type DivProps = React.ComponentProps<"div">;

type RootElement = HTMLDivElement;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface StoreState {
  value: number;
  isDragging: boolean;
}

interface Store {
  subscribe: (callback: () => void) => () => void;
  getState: () => StoreState;
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  notify: () => void;
}

const StoreContext = React.createContext<Store | null>(null);

function useStore<T>(
  selector: (state: StoreState) => T,
  ogStore?: Store | null,
): T {
  const contextStore = React.useContext(StoreContext);

  const store = ogStore ?? contextStore;

  if (!store) {
    throw new Error(`\`useStore\` must be used within \`${ROOT_NAME}\``);
  }

  const getSnapshot = React.useCallback(
    () => selector(store.getState()),
    [store, selector],
  );

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface CompareSliderContextValue {
  interaction: Interaction;
  orientation: Orientation;
}

const CompareSliderContext =
  React.createContext<CompareSliderContextValue | null>(null);

function useCompareSliderContext(consumerName: string) {
  const context = React.useContext(CompareSliderContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

interface CompareSliderProps extends DivProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  step?: number;
  interaction?: Interaction;
  orientation?: Orientation;
}

function CompareSlider(props: CompareSliderProps) {
  const {
    value: valueProp,
    defaultValue = 50,
    onValueChange,
    step = 1,
    interaction = "drag",
    orientation = "horizontal",
    className,
    children,
    ref,
    onPointerMove: onPointerMoveProp,
    onPointerUp: onPointerUpProp,
    onPointerDown: onPointerDownProp,
    onKeyDown: onKeyDownProp,
    ...rootProps
  } = props;

  const stateRef = useLazyRef<StoreState>(() => ({
    value: clamp(valueProp ?? defaultValue, 0, 100),
    isDragging: false,
  }));
  const listenersRef = useLazyRef(() => new Set<() => void>());
  const onValueChangeRef = useAsRef(onValueChange);

  const store = React.useMemo<Store>(() => {
    return {
      subscribe: (cb) => {
        listenersRef.current.add(cb);
        return () => listenersRef.current.delete(cb);
      },
      getState: () => stateRef.current,
      setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => {
        if (Object.is(stateRef.current[key], value)) return;
        stateRef.current[key] = value;

        if (key === "value") {
          onValueChangeRef.current?.(value as number);
        }

        store.notify();
      },
      notify: () => {
        for (const cb of listenersRef.current) {
          cb();
        }
      },
    };
  }, [listenersRef, stateRef, onValueChangeRef]);

  const rootRef = React.useRef<RootElement | null>(null);
  const composedRef = React.useCallback(
    (node: RootElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<RootElement | null>).current = node;
    },
    [ref],
  );
  const isDraggingRef = React.useRef(false);

  const propsRef = useAsRef({
    onPointerMove: onPointerMoveProp,
    onPointerUp: onPointerUpProp,
    onPointerDown: onPointerDownProp,
    onKeyDown: onKeyDownProp,
    interaction,
    orientation,
    step,
  });

  const value = useStore((state) => state.value, store);

  useIsomorphicLayoutEffect(() => {
    if (valueProp !== undefined) {
      store.setState("value", clamp(valueProp, 0, 100));
    }
  }, [valueProp]);

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<RootElement>) => {
      if (!isDraggingRef.current && propsRef.current.interaction === "drag") {
        return;
      }
      if (!rootRef.current) return;

      propsRef.current.onPointerMove?.(event);
      if (event.defaultPrevented) return;

      const rootRect = rootRef.current.getBoundingClientRect();
      const isVertical = propsRef.current.orientation === "vertical";
      const position = isVertical
        ? event.clientY - rootRect.top
        : event.clientX - rootRect.left;
      const size = isVertical ? rootRect.height : rootRect.width;
      const percentage = clamp((position / size) * 100, 0, 100);

      store.setState("value", percentage);
    },
    [propsRef, store],
  );

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<RootElement>) => {
      if (propsRef.current.interaction !== "drag") return;

      propsRef.current.onPointerDown?.(event);
      if (event.defaultPrevented) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      isDraggingRef.current = true;
      store.setState("isDragging", true);
      onPointerMove(event);
    },
    [store, propsRef, onPointerMove],
  );

  const onPointerUp = React.useCallback(
    (event: React.PointerEvent<RootElement>) => {
      if (propsRef.current.interaction !== "drag") return;

      propsRef.current.onPointerUp?.(event);
      if (event.defaultPrevented) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      isDraggingRef.current = false;
      store.setState("isDragging", false);
    },
    [store, propsRef],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<RootElement>) => {
      propsRef.current.onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const currentValue = store.getState().value;
      const isVertical = propsRef.current.orientation === "vertical";

      if (event.key === "Home") {
        event.preventDefault();
        store.setState("value", 0);
      } else if (event.key === "End") {
        event.preventDefault();
        store.setState("value", 100);
      } else if (PAGE_KEYS.concat(ARROW_KEYS).includes(event.key)) {
        event.preventDefault();

        const isPageKey = PAGE_KEYS.includes(event.key);
        const isSkipKey =
          isPageKey || (event.shiftKey && ARROW_KEYS.includes(event.key));
        const multiplier = isSkipKey ? 10 : 1;

        let direction = 0;
        if (isVertical) {
          const isDecreaseKey = ["ArrowUp", "PageUp"].includes(event.key);
          direction = isDecreaseKey ? -1 : 1;
        } else {
          const isDecreaseKey = ["ArrowLeft", "PageUp"].includes(event.key);
          direction = isDecreaseKey ? -1 : 1;
        }

        const stepInDirection = propsRef.current.step * multiplier * direction;
        const newValue = clamp(currentValue + stepInDirection, 0, 100);
        store.setState("value", newValue);
      }
    },
    [store, propsRef],
  );

  const contextValue = React.useMemo<CompareSliderContextValue>(
    () => ({
      interaction,
      orientation,
    }),
    [interaction, orientation],
  );

  return (
    <StoreContext.Provider value={store}>
      <CompareSliderContext.Provider value={contextValue}>
        <div
          role="slider"
          aria-orientation={orientation}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={value}
          data-slot="compare-slider"
          data-orientation={orientation}
          {...rootProps}
          ref={composedRef}
          tabIndex={0}
          className={cn(
            "relative isolate touch-pan-y select-none overflow-hidden focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-ember",
            orientation === "horizontal" ? "w-full" : "h-full",
            className,
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {children}
        </div>
      </CompareSliderContext.Provider>
    </StoreContext.Provider>
  );
}

interface CompareSliderBeforeProps extends DivProps {
  label?: string;
}

function CompareSliderBefore(props: CompareSliderBeforeProps) {
  const { className, children, style, label, ref, ...beforeProps } =
    props;

  const value = useStore((state) => state.value);
  const { orientation } = useCompareSliderContext(BEFORE_NAME);

  const labelId = React.useId();

  const isVertical = orientation === "vertical";
  const clipPath = isVertical
    ? `inset(${value}% 0 0 0)`
    : `inset(0 0 0 ${value}%)`;

  return (
    <div
      role="img"
      aria-labelledby={label ? labelId : undefined}
      aria-hidden={label ? undefined : "true"}
      data-slot="compare-slider-before"
      data-orientation={orientation}
      {...beforeProps}
      ref={ref}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      style={{
        clipPath,
        ...style,
      }}
    >
      {children}
      {label && (
        <CompareSliderLabel id={labelId} side="before">
          {label}
        </CompareSliderLabel>
      )}
    </div>
  );
}

interface CompareSliderAfterProps extends DivProps {
  label?: string;
}

function CompareSliderAfter(props: CompareSliderAfterProps) {
  const { className, children, style, label, ref, ...afterProps } =
    props;

  const value = useStore((state) => state.value);
  const { orientation } = useCompareSliderContext(AFTER_NAME);

  const labelId = React.useId();

  const isVertical = orientation === "vertical";
  const clipPath = isVertical
    ? `inset(0 0 ${100 - value}% 0)`
    : `inset(0 ${100 - value}% 0 0)`;

  return (
    <div
      role="img"
      aria-labelledby={label ? labelId : undefined}
      aria-hidden={label ? undefined : "true"}
      data-slot="compare-slider-after"
      data-orientation={orientation}
      {...afterProps}
      ref={ref}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      style={{
        clipPath,
        ...style,
      }}
    >
      {children}
      {label && (
        <CompareSliderLabel id={labelId} side="after">
          {label}
        </CompareSliderLabel>
      )}
    </div>
  );
}

function CompareSliderHandle(props: DivProps) {
  const { className, children, style, ref, ...handleProps } = props;

  const value = useStore((state) => state.value);
  const { interaction, orientation } = useCompareSliderContext(HANDLE_NAME);

  const isVertical = orientation === "vertical";

  return (
    <div
      role="presentation"
      aria-hidden="true"
      data-slot="compare-slider-handle"
      data-orientation={orientation}
      {...handleProps}
      ref={ref}
      className={cn(
        "absolute z-50 flex items-center justify-center",
        isVertical
          ? "left-0 h-10 w-full -translate-y-1/2"
          : "top-0 h-full w-10 -translate-x-1/2",
        interaction === "drag" && "cursor-ew-resize",
        className,
      )}
      style={{
        [isVertical ? "top" : "left"]: `${value}%`,
        ...style,
      }}
    >
      {children ?? (
        <>
          <div
            className={cn(
              "absolute bg-white",
              isVertical
                ? "top-1/2 h-0.5 w-full -translate-y-1/2"
                : "left-1/2 h-full w-0.5 -translate-x-1/2",
            )}
          />
          {interaction === "drag" && (
            <div className="z-50 flex aspect-square size-11 shrink-0 items-center justify-center rounded-full bg-white p-2 text-ink shadow-[0_4px_16px_rgb(0_0_0/0.35)] [&_svg]:size-4 [&_svg]:select-none">
              {isVertical ? (
                <div className="flex flex-col items-center">
                  <ChevronUpIcon />
                  <ChevronDownIcon />
                </div>
              ) : (
                <div className="flex items-center">
                  <ChevronLeftIcon />
                  <ChevronRightIcon />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface CompareSliderLabelProps extends DivProps {
  side?: "before" | "after";
}

function CompareSliderLabel(props: CompareSliderLabelProps) {
  const { className, children, side, ref, ...labelProps } = props;

  const { orientation } = useCompareSliderContext(LABEL_NAME);
  const isVertical = orientation === "vertical";

  return (
    <div
      ref={ref}
      data-slot="compare-slider-label"
      className={cn(
        "absolute z-20 rounded-full bg-[rgb(20_14_11/0.72)] px-3 py-1 font-bold text-[0.8rem] text-white",
        isVertical
          ? side === "before"
            ? "top-3 left-3"
            : "bottom-3 left-3"
          : side === "before"
            ? "top-3 left-3"
            : "top-3 right-3",
        className,
      )}
      {...labelProps}
    >
      {children}
    </div>
  );
}

export {
  CompareSlider,
  CompareSliderAfter,
  CompareSliderBefore,
  CompareSliderHandle,
  CompareSliderLabel,
  type CompareSliderProps,
};

export default CompareSlider;
