"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { OctoAccessory, OctoColor, OctoMood, OctoProp } from "@/types/octo";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface VideoLayer {
  uid: number;
  src: string;
  scenario: OctoScenario;
  ready: boolean;
}

const SCENARIO_GLOW: Record<OctoScenario, string> = {
  idle: "radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.28), transparent 72%)",
  working: "radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.28), transparent 72%)",
  promoted: "radial-gradient(circle at 50% 45%, rgba(251, 191, 36, 0.42), rgba(16, 185, 129, 0.22) 48%, transparent 74%)",
  panicked: "radial-gradient(circle at 50% 45%, rgba(244, 63, 94, 0.42), transparent 72%)",
  sleeping: "radial-gradient(circle at 50% 45%, rgba(99, 102, 241, 0.34), transparent 72%)",
};

export type OctoScenario =
  | "idle"
  | "working"
  | "promoted"
  | "panicked"
  | "sleeping";

interface OctoPuppetProps {
  color: OctoColor;
  accessory: OctoAccessory;
  prop?: OctoProp;
  mood: OctoMood;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  speaking?: boolean;
  playVideo?: boolean;
}

const PLUSH_IMAGES: Record<OctoAccessory, string> = {
  beret_glasses: "/characters/octo-01-inko.jpg",
  tophat_moustache: "/characters/scene-barnaby-working.jpg",
  headset_tie: "/characters/scene-squidney-working.jpg",
  boba_matcha: "/characters/octo-04-boba.jpg",
  cfo_monocle: "/characters/scene-board-cfo.jpg",
  nori_beanie: "/characters/octo-06-nori.jpg",
  mochi_headphones: "/characters/octo-07-mochi.jpg",
  gumbo_fedora: "/characters/octo-08-gumbo.jpg",
  ciso_detective: "/characters/scene-board-ciso.jpg",
  vp_shades: "/characters/scene-board-vp.jpg",
  truffle_prof: "/characters/octo-11-truffle.jpg",
  zest_mohawk: "/characters/octo-12-zest.jpg",
  founder_crown: "/characters/octo-13-pistachio.jpg",
  plum_pompadour: "/characters/octo-14-plum.jpg",
  cinnamon_beanie: "/characters/octo-15-cinnamon.jpg",
  cloud_nightcap: "/characters/octo-16-cloud.jpg",
  matcha_tartan: "/characters/octo-17-matcha.jpg",
  berry_retro: "/characters/octo-18-berry.jpg",
  cobalt_captain: "/characters/octo-19-cobalt.jpg",
  honey_geek: "/characters/octo-20-honey.jpg",
};

const SCENARIO_POSTERS: Partial<
  Record<OctoAccessory, Partial<Record<OctoScenario, string>>>
> = {
  beret_glasses: {
    idle: "/characters/octo-01-inko.jpg",
    working: "/characters/octo-01-inko.jpg",
    promoted: "/characters/octo-01-inko.jpg",
  },
  tophat_moustache: {
    idle: "/characters/octo-02-barnaby.jpg",
    working: "/characters/scene-barnaby-working.jpg",
    promoted: "/characters/scene-barnaby-working.jpg",
  },
  headset_tie: {
    idle: "/characters/octo-03-squidney.jpg",
    working: "/characters/scene-squidney-working.jpg",
    promoted: "/characters/scene-squidney-working.jpg",
    panicked: "/characters/scene-squidney-panicked.jpg",
  },
  boba_matcha: { working: "/characters/scene-boba-working.jpg" },
  nori_beanie: { working: "/characters/scene-nori-working.jpg" },
  mochi_headphones: { working: "/characters/scene-mochi-working.jpg" },
  gumbo_fedora: { working: "/characters/scene-gumbo-working.jpg" },
  truffle_prof: { working: "/characters/scene-truffle-working.jpg" },
  zest_mohawk: { working: "/characters/scene-zest-working.jpg" },
  plum_pompadour: { working: "/characters/scene-plum-working.jpg" },
  ciso_detective: {
    idle: "/characters/scene-board-ciso.jpg",
    working: "/characters/scene-board-ciso.jpg",
  },
  cfo_monocle: {
    idle: "/characters/scene-board-cfo.jpg",
    working: "/characters/scene-board-cfo.jpg",
  },
  vp_shades: {
    idle: "/characters/scene-board-vp.jpg",
    working: "/characters/scene-board-vp.jpg",
  },
};

const SCENARIO_VIDEOS: Record<
  OctoAccessory,
  Partial<Record<OctoScenario, string>>
> = {
  beret_glasses: {
    idle: "/videos/inko-idle.mp4",
    working: "/videos/inko-working.mp4",
    promoted: "/videos/inko-promoted.mp4",
    panicked: "/videos/inko-panicked.mp4",
    sleeping: "/videos/inko-sleeping.mp4",
  },
  tophat_moustache: {
    idle: "/videos/barnaby-idle.mp4",
    working: "/videos/barnaby-working.mp4",
    promoted: "/videos/barnaby-promoted.mp4",
    panicked: "/videos/barnaby-panicked.mp4",
    sleeping: "/videos/barnaby-sleeping.mp4",
  },
  headset_tie: {
    idle: "/videos/squidney-idle.mp4",
    working: "/videos/squidney-working.mp4",
    promoted: "/videos/squidney-promoted.mp4",
    panicked: "/videos/squidney-panicked.mp4",
    sleeping: "/videos/squidney-sleeping.mp4",
  },
  boba_matcha: {
    idle: "/videos/boba-idle.mp4",
    working: "/videos/boba-working.mp4",
    promoted: "/videos/boba-promoted.mp4",
    panicked: "/videos/boba-panicked.mp4",
    sleeping: "/videos/boba-sleeping.mp4",
  },
  cfo_monocle: {
    idle: "/videos/waffles-idle.mp4",
    working: "/videos/waffles-idle.mp4",
    promoted: "/videos/waffles-promoted.mp4",
    panicked: "/videos/waffles-skeptical.mp4",
  },
  nori_beanie: {
    idle: "/videos/nori-idle.mp4",
    working: "/videos/nori-working.mp4",
    promoted: "/videos/nori-promoted.mp4",
    panicked: "/videos/nori-panicked.mp4",
    sleeping: "/videos/nori-sleeping.mp4",
  },
  mochi_headphones: {
    idle: "/videos/mochi-idle.mp4",
    working: "/videos/mochi-working.mp4",
    promoted: "/videos/mochi-promoted.mp4",
    panicked: "/videos/mochi-panicked.mp4",
    sleeping: "/videos/mochi-sleeping.mp4",
  },
  gumbo_fedora: {
    idle: "/videos/gumbo-idle.mp4",
    working: "/videos/gumbo-working.mp4",
    promoted: "/videos/gumbo-promoted.mp4",
    panicked: "/videos/gumbo-panicked.mp4",
    sleeping: "/videos/gumbo-sleeping.mp4",
  },
  ciso_detective: {
    idle: "/videos/pebble-idle.mp4",
    working: "/videos/pebble-idle.mp4",
    promoted: "/videos/pebble-promoted.mp4",
    panicked: "/videos/pebble-slams-gavel.mp4",
  },
  vp_shades: {
    idle: "/videos/yuzu-idle.mp4",
    working: "/videos/yuzu-idle.mp4",
    promoted: "/videos/yuzu-promoted.mp4",
    panicked: "/videos/yuzu-skeptical.mp4",
  },
  truffle_prof: {
    idle: "/videos/truffle-idle.mp4",
    working: "/videos/truffle-working.mp4",
    promoted: "/videos/truffle-promoted.mp4",
    panicked: "/videos/truffle-panicked.mp4",
    sleeping: "/videos/truffle-sleeping.mp4",
  },
  zest_mohawk: {
    idle: "/videos/zest-idle.mp4",
    working: "/videos/zest-working.mp4",
    promoted: "/videos/zest-promoted.mp4",
    panicked: "/videos/zest-panicked.mp4",
    sleeping: "/videos/zest-sleeping.mp4",
  },
  founder_crown: { idle: "/videos/pistachio-idle.mp4" },
  plum_pompadour: {
    idle: "/videos/plum-idle.mp4",
    working: "/videos/plum-working.mp4",
    promoted: "/videos/plum-promoted.mp4",
    panicked: "/videos/plum-panicked.mp4",
    sleeping: "/videos/plum-sleeping.mp4",
  },
  cinnamon_beanie: { idle: "/videos/cinnamon-idle.mp4" },
  cloud_nightcap: { idle: "/videos/cloud-idle.mp4" },
  matcha_tartan: { idle: "/videos/matcha-idle.mp4" },
  berry_retro: { idle: "/videos/berry-idle.mp4" },
  cobalt_captain: { idle: "/videos/cobalt-idle.mp4" },
  honey_geek: { idle: "/videos/honey-idle.mp4" },
};

const getScenarioFromMood = (m: OctoMood): OctoScenario =>
  m === "sleeping"
    ? "sleeping"
    : m === "panicked" || m === "skeptical" || m === "fired"
    ? "panicked"
    : m === "proud"
    ? "promoted"
    : m === "working"
    ? "working"
    : "idle";

export const OctoPuppet: React.FC<OctoPuppetProps> = ({
  accessory,
  mood,
  size = "lg",
  playVideo,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [fallbackToIdle, setFallbackToIdle] = useState<boolean>(false);
  const [videoAvailable, setVideoAvailable] = useState<boolean>(true);
  const activeScenario = getScenarioFromMood(mood);

  useEffect(() => {
    setFallbackToIdle(false);
    setVideoAvailable(true);
  }, [mood, accessory]);

  const heightClass =
    size === "sm" ? "h-full min-h-[5rem]" : size === "md" ? "h-48" : "h-64";
  const radiusClass = size === "sm" ? "rounded-2xl" : "rounded-[22px]";

  const fallbackPoster =
    SCENARIO_POSTERS[accessory]?.[activeScenario] ||
    PLUSH_IMAGES[accessory] ||
    PLUSH_IMAGES.beret_glasses;
  const charVideos = SCENARIO_VIDEOS[accessory];
  const primaryVideoSrc = charVideos?.[activeScenario];
  const idleVideoSrc = charVideos?.idle;
  const videoSrc =
    (!fallbackToIdle ? primaryVideoSrc : undefined) || idleVideoSrc || undefined;

  // Play all available octopus videos continuously unless explicitly disabled or reduced motion is requested
  const shouldPlayVideo =
    !shouldReduceMotion &&
    Boolean(videoSrc) &&
    videoAvailable &&
    (playVideo ?? true);

  const uidRef = useRef(1);
  const [layers, setLayers] = useState<VideoLayer[]>(() =>
    shouldPlayVideo && videoSrc
      ? [{ uid: 1, src: videoSrc, scenario: activeScenario, ready: false }]
      : []
  );
  const [transitionPulse, setTransitionPulse] = useState<{
    id: number;
    scenario: OctoScenario;
  } | null>(null);
  const prevTopReadyRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldPlayVideo || !videoSrc) {
      return;
    }

    setLayers((prev) => {
      const latest = prev[prev.length - 1];
      if (latest && latest.src === videoSrc) {
        return prev;
      }
      const nextUid = ++uidRef.current;
      // Keep the most recent ready layer underneath so the previous video keeps playing while the next buffers
      const readyLayers = prev.filter((l) => l.ready);
      const baseLayer =
        readyLayers.length > 0 ? [readyLayers[readyLayers.length - 1]] : [];
      return [
        ...baseLayer,
        { uid: nextUid, src: videoSrc, scenario: activeScenario, ready: false },
      ];
    });
  }, [shouldPlayVideo, videoSrc, activeScenario]);

  // Safety fallback in case a browser delays onLoadedData on a newly mounted video layer
  const pendingLayer = layers.find((l) => !l.ready);
  const pendingUid = pendingLayer?.uid ?? null;
  useEffect(() => {
    if (pendingUid === null) return;
    const timer = setTimeout(() => {
      setLayers((prev) =>
        prev.map((l) => (l.uid === pendingUid ? { ...l, ready: true } : l))
      );
    }, 1200);
    return () => clearTimeout(timer);
  }, [pendingUid]);

  const readyLayers = layers.filter((l) => l.ready);
  const topReadyLayer =
    readyLayers.length > 0 ? readyLayers[readyLayers.length - 1] : null;
  const topReadyUid = topReadyLayer?.uid ?? null;

  useEffect(() => {
    if (
      topReadyLayer &&
      prevTopReadyRef.current !== null &&
      prevTopReadyRef.current !== topReadyLayer.uid
    ) {
      setTransitionPulse({
        id: topReadyLayer.uid,
        scenario: topReadyLayer.scenario,
      });
    }
    if (topReadyLayer) {
      prevTopReadyRef.current = topReadyLayer.uid;
    }
  }, [topReadyLayer]);

  useEffect(() => {
    if (!transitionPulse) return;
    const timer = setTimeout(() => setTransitionPulse(null), 550);
    return () => clearTimeout(timer);
  }, [transitionPulse]);

  const markLayerReady = useCallback((uid: number) => {
    setLayers((prev) => {
      const target = prev.find((l) => l.uid === uid);
      if (!target || target.ready) return prev;
      return prev.map((l) => (l.uid === uid ? { ...l, ready: true } : l));
    });
  }, []);

  const handleLayerComplete = useCallback((uid: number) => {
    setLayers((prev) => {
      const target = prev.find((l) => l.uid === uid);
      if (!target || !target.ready) return prev;
      // Only keep this completed layer and any newer pending layers above it
      return prev.filter((l) => l.uid >= uid);
    });
  }, []);

  const handleVideoError = useCallback(
    (failedUid: number) => {
      setLayers((prev) => prev.filter((l) => l.uid !== failedUid));
      // Gracefully fall back to idle video if a scenario asset hasn't been generated yet
      if (
        !fallbackToIdle &&
        primaryVideoSrc &&
        idleVideoSrc &&
        primaryVideoSrc !== idleVideoSrc
      ) {
        setFallbackToIdle(true);
        return;
      }
      setVideoAvailable(false);
    },
    [fallbackToIdle, primaryVideoSrc, idleVideoSrc]
  );

  return (
    <div
      className={`relative w-full ${heightClass} ${radiusClass} overflow-hidden select-none bg-slate-100 ring-1 ring-slate-900/[0.05]`}
    >
      {/* Always-present animated plush fallback underneath so video transitions never flash blank */}
      <AnimatePresence mode="sync">
        <motion.img
          key={fallbackPoster}
          src={fallbackPoster}
          alt={`${accessory}-${activeScenario}`}
          initial={{ opacity: 0 }}
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  y: [0, -5, 0],
                  scaleX: [1, 0.985, 1.015, 1],
                  scaleY: [1, 1.025, 0.985, 1],
                  rotate: [-1.2, 1.2, -1.2],
                }
          }
          exit={{ opacity: 0, transition: { duration: 0.25, ease: EASE_OUT } }}
          transition={{
            opacity: { duration: 0.3, ease: EASE_OUT },
            y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
            scaleX: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
            scaleY: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute inset-0 w-full h-full object-cover origin-bottom pointer-events-none"
          draggable={false}
        />
      </AnimatePresence>

      {/* Double-buffered video stage for smooth crossfade & morph transitions between states */}
      <AnimatePresence
        onExitComplete={() => {
          if (!shouldPlayVideo) {
            setLayers([]);
            prevTopReadyRef.current = null;
          }
        }}
      >
        {shouldPlayVideo && videoSrc && (
          <motion.div
            key="video-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } }}
            exit={{
              opacity: 0,
              scale: 0.98,
              transition: { duration: 0.32, ease: EASE_OUT },
            }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {layers.map((layer) => {
              const isSuperseded =
                topReadyUid !== null && layer.uid < topReadyUid;
              const isTransitioningIn = layer.uid > 1;

              return (
                <motion.div
                  key={layer.uid}
                  initial={
                    isTransitioningIn
                      ? { opacity: 0, scale: 1.06, filter: "blur(6px)" }
                      : { opacity: 0, scale: 1.02, filter: "blur(0px)" }
                  }
                  animate={
                    !layer.ready
                      ? {
                          opacity: 0,
                          scale: isTransitioningIn ? 1.06 : 1.02,
                          filter: isTransitioningIn ? "blur(6px)" : "blur(0px)",
                        }
                      : isSuperseded
                      ? {
                          // Keep opaque underneath while gently receding so background never bleeds through
                          opacity: 1,
                          scale: 0.96,
                          filter: "blur(2px) brightness(0.92)",
                        }
                      : {
                          opacity: 1,
                          scale: 1,
                          filter: "blur(0px) brightness(1)",
                        }
                  }
                  transition={{
                    duration: isTransitioningIn ? 0.48 : 0.32,
                    ease: EASE_OUT,
                  }}
                  onAnimationComplete={() => {
                    if (layer.ready && layer.uid === topReadyUid) {
                      handleLayerComplete(layer.uid);
                    }
                  }}
                  className="absolute inset-0 w-full h-full will-change-[transform,opacity,filter]"
                >
                  <video
                    ref={(el) => {
                      if (el && el.readyState >= 2 && !layer.ready) {
                        queueMicrotask(() => markLayerReady(layer.uid));
                      }
                    }}
                    src={layer.src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    disablePictureInPicture
                    onLoadedData={(e) => {
                      e.currentTarget.play().catch(() => {});
                      markLayerReady(layer.uid);
                    }}
                    onCanPlay={(e) => {
                      e.currentTarget.play().catch(() => {});
                      markLayerReady(layer.uid);
                    }}
                    onPause={(e) => e.currentTarget.play().catch(() => {})}
                    onError={() => handleVideoError(layer.uid)}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle state-change radial shimmer sweep when morphing between video states */}
      <AnimatePresence>
        {transitionPulse && !shouldReduceMotion && (
          <motion.div
            key={`pulse-${transitionPulse.id}`}
            initial={{ opacity: 0.65, scale: 0.92 }}
            animate={{ opacity: 0, scale: 1.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
            style={{ background: SCENARIO_GLOW[transitionPulse.scenario] }}
            className="absolute inset-0 pointer-events-none z-10 mix-blend-screen"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
