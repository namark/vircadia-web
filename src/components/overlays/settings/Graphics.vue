<!--
//  Controls.vue
//
//  Created by Giga on Dec 14th, 2022.
//  Copyright 2022 Vircadia contributors.
//  Copyright 2022 DigiSomni LLC.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
-->

<style lang="scss">
/* TODO: Replace these style overrides with inline props once we have upgraded to Quasar >2.4.0. */
.q-slider__track-container--h {
    height: 5px;
    margin-top: -2.5px;
    border-radius: 3px;
}
.q-slider__track--h {
    border-radius: inherit;
}
.q-slider__thumb {
    transform: scale(1.3);
}
.q-slider__focus-ring {
    transition:
        transform 0.22s cubic-bezier(0, 0, 0.2, 1),
        opacity 0.22s cubic-bezier(0, 0, 0.2, 1),
        background-color 0.22s cubic-bezier(0, 0, 0.2, 1);
}
.q-slider--focus .q-slider__focus-ring,
body.desktop .q-slider.q-slider--editable:hover .q-slider__focus-ring {
    transform: scale3d(2, 2, 1);
}
</style>

<template>
    <OverlayShell
        icon="desktop_windows"
        title="Graphics"
        :managerProps="propsToPass"
        :defaultHeight="500"
        :defaultWidth="400"
    >
        <q-card
            class="column no-wrap items-stretch full-height"
            style="background: transparent;box-shadow: none;"
        >
            <q-scroll-area class="q-mt-md full-height">
                <q-list class="q-pb-md">
                    <q-item>
                        <q-item-section
                            title="Field of View"
                        >
                            Field of View
                        </q-item-section>
                        <q-item-section class="q-pl-xl">
                            <q-slider
                                name="fieldOfView"
                                :min="70"
                                :max="120"
                                :step="5"
                                snap
                                v-model="fieldOfView"
                            />
                        </q-item-section>
                        <q-item-section side style="min-width: 5ch;">
                            <output for="fieldOfView">{{ fieldOfView }}</output>
                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section
                            title="Bloom"
                        >
                            Bloom
                        </q-item-section>
                        <q-item-section class="q-pl-sm">
                            <q-toggle
                                name="bloom"
                                v-model="bloom"
                            />
                        </q-item-section>
                        <q-item-section side style="min-width: 5ch;">
                            <output for="bloom">{{ bloom ? `On` : `Off` }}</output>
                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section
                            title="Fast Approximate Anti-Aliasing"
                        >
                        FXAA
                        </q-item-section>
                        <q-item-section class="q-pl-sm">
                            <q-toggle
                                name="fxaaEnabled"
                                v-model="fxaaEnabled"
                            />
                        </q-item-section>
                        <q-item-section side style="min-width: 5ch;">
                            <output for="fxaaEnabled">{{ fxaaEnabled ? `On` : `Off` }}</output>
                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section
                            title="Multisample Anti-Aliasing"
                        >
                            MSAA
                        </q-item-section>
                        <q-item-section class="q-pl-xl">
                            <q-slider
                                name="msaa"
                                :min="1"
                                :max="8"
                                :step="1"
                                snap
                                v-model="msaa"
                            />
                        </q-item-section>
                        <q-item-section side style="min-width: 5ch;">
                            <output for="msaa">{{ msaa === 1 ? `Off` : `&times;${msaa}` }}</output>
                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section
                            title="Sharpen"
                        >
                            Sharpen
                        </q-item-section>
                        <q-item-section class="q-pl-sm">
                            <q-toggle
                                name="sharpen"
                                v-model="sharpen"
                            />
                        </q-item-section>
                        <q-item-section side style="min-width: 5ch;">
                            <output for="sharpen">{{ sharpen ? `On` : `Off` }}</output>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-scroll-area>
        </q-card>
    </OverlayShell>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import OverlayShell from "../OverlayShell.vue";
import { Mutations as StoreMutations } from "@Store/index";

export default defineComponent({
    name: "Graphics",
    props: {
        // Primary.
        propsToPass: { type: Object, default: () => ({}) }
    },
    components: {
        OverlayShell
    },
    computed: {
        fieldOfView: {
            get(): number {
                return this.$store.state.graphics.fieldOfView;
            },
            set(value: number | string) {
                // Mutate the parent "graphics" object so that the vscene responds.
                this.$store.commit(StoreMutations.MUTATE, {
                    property: "graphics",
                    value: {
                        fieldOfView: typeof value === "string" ? parseInt(value, 10) : value,
                        bloom: this.bloom,
                        fxaaEnabled: this.fxaaEnabled,
                        msaa: this.msaa,
                        sharpen: this.sharpen
                    }
                });
            }
        },
        bloom: {
            get(): boolean {
                return this.$store.state.graphics.bloom;
            },
            set(value: boolean) {
                // Mutate the parent "graphics" object so that the vscene responds.
                this.$store.commit(StoreMutations.MUTATE, {
                    property: "graphics",
                    value: {
                        fieldOfView: this.fieldOfView,
                        bloom: Boolean(value),
                        fxaaEnabled: this.fxaaEnabled,
                        msaa: this.msaa,
                        sharpen: this.sharpen
                    }
                });
            }
        },
        fxaaEnabled: {
            get(): boolean {
                return this.$store.state.graphics.fxaaEnabled;
            },
            set(value: boolean) {
                // Mutate the parent "graphics" object so that the vscene responds.
                this.$store.commit(StoreMutations.MUTATE, {
                    property: "graphics",
                    value: {
                        fieldOfView: this.fieldOfView,
                        bloom: this.bloom,
                        fxaaEnabled: Boolean(value),
                        msaa: this.msaa,
                        sharpen: this.sharpen
                    }
                });
            }
        },
        msaa: {
            get(): number {
                return this.$store.state.graphics.msaa;
            },
            set(value: number | string) {
                // Mutate the parent "graphics" object so that the vscene responds.
                this.$store.commit(StoreMutations.MUTATE, {
                    property: "graphics",
                    value: {
                        fieldOfView: this.fieldOfView,
                        bloom: this.bloom,
                        fxaaEnabled: this.fxaaEnabled,
                        msaa: typeof value === "string" ? parseInt(value, 10) : value,
                        sharpen: this.sharpen
                    }
                });
            }
        },
        sharpen: {
            get(): boolean {
                return this.$store.state.graphics.sharpen;
            },
            set(value: boolean) {
                // Mutate the parent "graphics" object so that the vscene responds.
                this.$store.commit(StoreMutations.MUTATE, {
                    property: "graphics",
                    value: {
                        fieldOfView: this.fieldOfView,
                        bloom: this.bloom,
                        fxaaEnabled: this.fxaaEnabled,
                        msaa: this.msaa,
                        sharpen: Boolean(value)
                    }
                });
            }
        }
    }
});
</script>
