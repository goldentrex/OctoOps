"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { OctoAccessory, OctoColor, OctoMood, OctoProp } from "@/types/octo";

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
  boba_matcha: { idle: "/videos/boba-idle.mp4" },
  cfo_monocle: {
    idle: "/videos/waffles-idle.mp4",
    working: "/videos/waffles-idle.mp4",
    panicked: "/videos/waffles-skeptical.mp4",
  },
  nori_beanie: { idle: "/videos/nori-idle.mp4" },
  mochi_headphones: { idle: "/videos/mochi-idle.mp4" },
  gumbo_fedora: { idle: "/videos/gumbo-idle.mp4" },
  ciso_detective: {
    idle: "/videos/pebble-idle.mp4",
    working: "/videos/pebble-idle.mp4",
    panicked: "/videos/pebble-slams-gavel.mp4",
  },
  vp_shades: {
    idle: "/videos/yuzu-idle.mp4",
    working: "/videos/yuzu-idle.mp4",
  },
  truffle_prof: { idle: "/videos/truffle-idle.mp4" },
  zest_mohawk: { idle: "/videos/zest-idle.mp4" },
  founder_crown: { idle: "/videos/pistachio-idle.mp4" },
  plum_pompadour: {
    idle: "/videos/plum-idle.mp4",
    working: "/videos/plum-idle.mp4",
    promoted: "/videos/plum-idle.mp4",
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
  speaking = false,
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

  const handleVideoError = () => {
    // Gracefully fall back to idle video if a scenario asset hasn't been generated yet
    if (!fallbackToIdle && primaryVideoSrc && idleVideoSrc && primaryVideoSrc !== idleVideoSrc) {
      setFallbackToIdle(true);
      return;
    }
    setVideoAvailable(false);
  };

  return (
    <div
      className={`relative w-full ${heightClass} ${radiusClass} overflow-hidden select-none bg-slate-100 ring-1 ring-slate-900/[0.05]`}
    >
      {shouldPlayVideo && videoSrc ? (
        <video
          key={videoSrc}
          src={videoSrc}
          poster={fallbackPoster}
          autoPlay
          loop
          muted
          playsInline
          disablePictureInPicture
          onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
          onPause={(e) => e.currentTarget.play().catch(() => {})}
          onError={handleVideoError}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <motion.img
          src={fallbackPoster}
          alt={`${accessory}-${activeScenario}`}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -5, 0],
                  scaleX: [1, 0.985, 1.015, 1],
                  scaleY: [1, 1.025, 0.985, 1],
                  rotate: [-1.2, 1.2, -1.2],
                }
          }
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-full h-full object-cover origin-bottom pointer-events-none"
          draggable={false}
        />
      )}
    </div>
  );
};
