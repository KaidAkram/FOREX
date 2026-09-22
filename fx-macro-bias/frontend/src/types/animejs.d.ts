// Type declaration shim for animejs (no @types/animejs available for v3)
declare module "animejs" {
  interface AnimeParams {
    targets?: unknown;
    duration?: number;
    delay?: number | ((el: Element, i: number) => number);
    easing?: string;
    loop?: boolean | number;
    direction?: "normal" | "reverse" | "alternate";
    autoplay?: boolean;
    round?: number;
    update?: (anim: AnimeInstance) => void;
    begin?: (anim: AnimeInstance) => void;
    complete?: (anim: AnimeInstance) => void;
    [prop: string]: unknown;
  }

  interface AnimeInstance {
    play: () => void;
    pause: () => void;
    restart: () => void;
    seek: (time: number) => void;
    finished: Promise<void>;
  }

  function anime(params: AnimeParams): AnimeInstance;
  export = anime;
}
