"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTournament } from "./store";
import { computeStats, type Stats } from "./selectors";

type PricingOverride = {
  buyIn?: number;
  rebuyCost?: number;
  addOnCost?: number;
};

/**
 * Live tournament stats (field size, chips, prize pool, …) derived from the
 * store. `pricing` lets the settings form preview the pool with unsaved
 * entry prices.
 */
export function useTournamentStats(pricing?: PricingOverride): Stats {
  const s = useTournament(
    useShallow((st) => ({
      players: st.players,
      blindStructure: st.blindStructure,
      currentLevel: st.clock.currentLevel,
      buyIn: st.buyIn,
      rebuyCost: st.rebuyCost,
      addOnCost: st.addOnCost,
      startingStack: st.startingStack,
      rebuyChips: st.rebuyChips,
      addOnChips: st.addOnChips,
      removedEntries: st.removedEntries,
    })),
  );
  const buyIn = pricing?.buyIn ?? s.buyIn;
  const rebuyCost = pricing?.rebuyCost ?? s.rebuyCost;
  const addOnCost = pricing?.addOnCost ?? s.addOnCost;

  return useMemo(
    () =>
      computeStats(
        s.players,
        s.blindStructure,
        s.currentLevel,
        buyIn,
        addOnCost,
        {
          startingStack: s.startingStack,
          rebuyChips: s.rebuyChips,
          addOnChips: s.addOnChips,
        },
        rebuyCost,
        s.removedEntries,
      ),
    [
      s.players,
      s.blindStructure,
      s.currentLevel,
      buyIn,
      addOnCost,
      rebuyCost,
      s.startingStack,
      s.rebuyChips,
      s.addOnChips,
      s.removedEntries,
    ],
  );
}
