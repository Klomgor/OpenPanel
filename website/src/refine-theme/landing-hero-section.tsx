import React from "react";
import clsx from "clsx";
import { LandingHeroGithubStars } from "./landing-hero-github-stars";
import { LandingStartActionIcon } from "./icons/landing-start-action";

import { LandingHeroAnimation } from "./landing-hero-animation";
import { LandingCopyCommandButton } from "./landing-copy-command-button";
import Link from "@docusaurus/Link";
import { LandingHeroShowcaseSection } from "./landing-hero-showcase-section";

export const LandingHeroSection = ({ className }: { className?: string }) => {
    return (
        <div
            className={clsx(
                "flex",
                "flex-col",
                "w-full",
                "gap-2",
                className,
            )}
        >
            <div
                className={clsx(
                    "px-2 landing-sm:px-0",
                    "flex",
                    "flex",
                    "w-full",
                    "relative",
                    "min-h-[360px]",
                    "landing-lg:min-h-[480px]",
                    "py-4",
                )}
            >
                <div
                    className={clsx(
                        "landing-sm:pl-10",
                        "flex",
                        "flex-col",
                        "justify-center",
                        "gap-6",
                        "z-[1]",
                        "landing-lg:justify-between",
                        "landing-lg:py-8",
                    )}
                >
                    <LandingHeroGithubStars />
                    <div className={clsx("flex", "flex-col", "gap-6")}>
                        <h1
                            className={clsx(
                                "text-[32px] leading-[40px]",
                                "tracking-[-0.5%]",
                                "landing-sm:text-[56px] landing-sm:leading-[72px]",
                                "landing-sm:max-w-[588px]",
                                "landing-sm:tracking-[-2%]",
                                "font-extrabold",
                                "text-gray-900 dark:text-gray-0",
                            )}
                        >
			<span class="text-transparent bg-clip-text bg-gradient-to-r text-gradient-to-r from-[#0FBDBD] to-[#26D97F]">c*anel Alternative</span>  Web Hosting Panel
                        </h1>
                        <p
                            className={clsx(
                                "font-normal",
                                "text-base",
                                "text-gray-600 dark:text-gray-300",
                                "landing-xs:max-w-[384px]",
                            )}
                        >
							OpenPanel is a multi-user web hosting panel designed around Docker containers. Each user gets their own isolated environment, including separate MySQL server, PHP versions, Redis, and more.
						</p>
                        <p
                            className={clsx(
                                "font-normal",
                                "text-base",
                                "text-gray-600 dark:text-gray-300",
                                "landing-xs:max-w-[384px]",
                            )}
                        >
							Try the free Community Edition with command:
						</p>
                    </div>
                    <div
                        className={clsx(
                            "flex",
                            "items-center",
                            "justify-start",
                            "gap-4",
                            "landing-lg:gap-6",
                        )}
                    >
			<LandingCopyCommandButton
			className={clsx("hidden", "landing-sm:block")}
			/>
                    </div>
                </div>
                <div
                    className={clsx(
                        "hidden landing-md:block",
                        "absolute",
                        "top-0",
                        "right-0",
                    )}
                >
                    <LandingHeroAnimation />
                </div>
            </div>
            <LandingHeroShowcaseSection />
        </div>
    );
};
