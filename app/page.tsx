"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

interface Car {
  id: string;
  name: string;
  image: string;
  color: string;
  owner: "tommy" | "nico";
}

const ALL_CARS: Car[] = [
  { id: "chrome", name: "Chrome", image: "/cars/chrome.jpeg", color: "#f97316", owner: "tommy" },
  { id: "haas", name: "Haas", image: "/cars/haas.jpeg", color: "#dc2626", owner: "tommy" },
  { id: "alpine", name: "Alpine", image: "/cars/alpine.jpeg", color: "#ec4899", owner: "tommy" },
  { id: "visa", name: "VISA", image: "/cars/visa.jpeg", color: "#3b82f6", owner: "tommy" },
  { id: "kick", name: "Kick", image: "/cars/kick.jpeg", color: "#22c55e", owner: "tommy" },
  { id: "golden-thunder", name: "Golden Thunder", image: "/cars/golden-thunder.jpeg", color: "#eab308", owner: "tommy" },
  { id: "phantom-blaze", name: "Phantom Blaze", image: "/cars/phantom-blaze.jpeg", color: "#d946ef", owner: "tommy" },
  { id: "kowloon-hypervan", name: "Kowloon Hypervan", image: "/cars/nico/kowloon-hypervan.jpeg", color: "#22c55e", owner: "nico" },
  { id: "yellow-rocket", name: "Yellow Rocket", image: "/cars/nico/yellow-rocket.jpeg", color: "#facc15", owner: "nico" },
  { id: "silver-68", name: "Silver 68", image: "/cars/nico/silver-68.jpeg", color: "#94a3b8", owner: "nico" },
  { id: "mario-kart", name: "Mario Kart", image: "/cars/nico/mario-kart.jpeg", color: "#ef4444", owner: "nico" },
  { id: "popper-wheelie", name: "Popper Wheelie", image: "/cars/nico/popper-wheelie.jpeg", color: "#3b82f6", owner: "nico" },
  { id: "white-stallion", name: "White Stallion", image: "/cars/nico/white-stallion.jpeg", color: "#f8fafc", owner: "nico" },
  { id: "red-rocket", name: "Red Rocket", image: "/cars/nico/red-rocket.jpeg", color: "#ef4444", owner: "nico" },
];

interface Matchup {
  cars: [Car, Car];
  isOvertime: boolean;
  label: string;
}

type Phase = "pick-pair" | "pre-race" | "racing" | "result" | "pick-challenger" | "overtime-intro" | "game-over";

export default function Home() {
  const [pair, setPair] = useState<[Car | null, Car | null]>([null, null]);
  const [pairWinnerIdx, setPairWinnerIdx] = useState<0 | 1>(0);
  const [initialRaceDone, setInitialRaceDone] = useState(false);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [carsInGame, setCarsInGame] = useState<Car[]>([]);

  const [phase, setPhase] = useState<Phase>("pick-pair");
  const [currentMatchup, setCurrentMatchup] = useState<Matchup | null>(null);
  const [matchupQueue, setMatchupQueue] = useState<Matchup[]>([]);
  const [positions, setPositions] = useState<[number, number]>([0, 0]);
  const [winner, setWinner] = useState<number | null>(null);
  const [usedChallengerIds, setUsedChallengerIds] = useState<Set<string>>(new Set());
  const [raceLog, setRaceLog] = useState<string[]>([]);
  const raceInterval = useRef<NodeJS.Timeout | null>(null);

  const availableChallengers = ALL_CARS.filter(
    c => c.id !== pair[0]?.id && c.id !== pair[1]?.id && !usedChallengerIds.has(c.id)
  );
  const tommyChallengers = availableChallengers.filter(c => c.owner === "tommy");
  const nicoChallengers = availableChallengers.filter(c => c.owner === "nico");

  // Find score ties at 2+ wins
  const findOvertimes = useCallback((s: Record<string, number>, cars: Car[]): Matchup[] => {
    const result: Matchup[] = [];
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i], b = cars[j];
        const sa = s[a.id] || 0, sb = s[b.id] || 0;
        if (sa >= 2 && sa === sb) {
          result.push({
            cars: [a, b],
            isOvertime: true,
            label: `Tied at ${sa} wins!`,
          });
        }
      }
    }
    return result;
  }, []);

  const beginMatchup = useCallback((matchup: Matchup) => {
    setCurrentMatchup(matchup);
    setPositions([0, 0]);
    setWinner(null);
    setPhase(matchup.isOvertime ? "overtime-intro" : "pre-race");
  }, []);

  // Run the race animation via ref to avoid stale closures on re-race
  const runRaceRef = useRef<(isOvertime: boolean) => void>(() => {});
  runRaceRef.current = (isOvertime: boolean) => {
    setPhase("racing");
    setPositions([0, 0]);
    setWinner(null);
    const pos: [number, number] = [0, 0];
    const speed = isOvertime ? 2.5 : 1.5;

    raceInterval.current = setInterval(() => {
      pos[0] += Math.random() * speed + 0.3;
      pos[1] += Math.random() * speed + 0.3;
      setPositions([...pos] as [number, number]);

      if (pos[0] >= 100 || pos[1] >= 100) {
        clearInterval(raceInterval.current!);
        let raceWinner: number;
        if (pos[0] >= 100 && pos[1] >= 100) {
          raceWinner = pos[0] >= pos[1] ? 0 : 1;
        } else {
          raceWinner = pos[0] >= 100 ? 0 : 1;
        }
        setWinner(raceWinner);
        setPhase("result");
      }
    }, 50);
  };

  const startRace = () => runRaceRef.current(currentMatchup?.isOvertime ?? false);

  const handleContinue = () => {
    if (winner === null || !currentMatchup) return;

    const winnerCar = currentMatchup.cars[winner];
    const newScores = { ...scores, [winnerCar.id]: (scores[winnerCar.id] || 0) + 1 };
    setScores(newScores);

    const pts = newScores[winnerCar.id];
    setRaceLog(prev => [
      ...prev,
      `${winnerCar.name} wins!${currentMatchup.isOvertime ? " [OVERTIME]" : ""} (${pts} pt${pts !== 1 ? "s" : ""})`,
    ]);

    // Initial pair race just finished
    if (!initialRaceDone) {
      setInitialRaceDone(true);
      setPairWinnerIdx(winner as 0 | 1);
      setPhase("pick-challenger");
      return;
    }

    // More races queued?
    if (matchupQueue.length > 0) {
      const [next, ...rest] = matchupQueue;
      setMatchupQueue(rest);
      beginMatchup(next);
      return;
    }

    // Check for score ties → overtime
    const overtimes = findOvertimes(newScores, carsInGame);
    if (overtimes.length > 0) {
      const [first, ...rest] = overtimes;
      setMatchupQueue(rest);
      beginMatchup(first);
      return;
    }

    // No ties → pick next challenger or game over
    if (availableChallengers.length > 0) {
      setPhase("pick-challenger");
    } else {
      setPhase("game-over");
    }
  };

  const selectPairCar = (car: Car, slot: 0 | 1) => {
    if (phase !== "pick-pair") return;
    const newPair: [Car | null, Car | null] = [...pair];
    if (newPair[1 - slot]?.id === car.id) return;
    newPair[slot] = car;
    setPair(newPair);

    if (newPair[0] && newPair[1]) {
      const a = newPair[0], b = newPair[1];
      setCarsInGame([a, b]);
      setScores({ [a.id]: 0, [b.id]: 0 });
      beginMatchup({
        cars: [a, b],
        isOvertime: false,
        label: "Opening Race",
      });
    }
  };

  const selectChallenger = (car: Car) => {
    if (phase !== "pick-challenger" || !pair[0] || !pair[1]) return;

    setUsedChallengerIds(prev => new Set(prev).add(car.id));
    setCarsInGame(prev => [...prev, car]);
    setScores(prev => ({ ...prev, [car.id]: 0 }));

    const w = pair[pairWinnerIdx]!;
    const l = pair[1 - pairWinnerIdx]!;

    const races: Matchup[] = [
      { cars: [w, car], isOvertime: false, label: `${w.name} vs ${car.name}` },
      { cars: [l, car], isOvertime: false, label: `${l.name} vs ${car.name}` },
    ];

    setMatchupQueue(races.slice(1));
    beginMatchup(races[0]);
  };

  useEffect(() => {
    return () => {
      if (raceInterval.current) clearInterval(raceInterval.current);
    };
  }, []);

  const resetGame = () => {
    if (raceInterval.current) clearInterval(raceInterval.current);
    setPair([null, null]);
    setPairWinnerIdx(0);
    setInitialRaceDone(false);
    setScores({});
    setCarsInGame([]);
    setPhase("pick-pair");
    setCurrentMatchup(null);
    setMatchupQueue([]);
    setPositions([0, 0]);
    setWinner(null);
    setUsedChallengerIds(new Set());
    setRaceLog([]);
  };

  const scoreboard = [...carsInGame].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  const CarGrid = ({ cars, title, ownerColor }: { cars: Car[]; title: string; ownerColor: string }) => {
    if (cars.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2" style={{ color: ownerColor }}>{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {cars.map(car => (
            <button
              key={car.id}
              onClick={() => {
                if (phase === "pick-pair") {
                  const slot = pair[0] === null ? 0 : pair[1] === null ? 1 : null;
                  if (slot !== null) selectPairCar(car, slot as 0 | 1);
                } else if (phase === "pick-challenger") {
                  selectChallenger(car);
                }
              }}
              className="p-3 rounded-xl border-2 transition-all border-gray-700 hover:border-gray-400 hover:scale-105 cursor-pointer"
            >
              <div className="w-full aspect-square relative rounded-lg overflow-hidden mb-2">
                <Image src={car.image} alt={car.name} fill className="object-cover" />
              </div>
              <p className="font-bold text-sm" style={{ color: car.color }}>{car.name}</p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const pairPickTommy = ALL_CARS.filter(c => c.owner === "tommy" && c.id !== pair[0]?.id && c.id !== pair[1]?.id);
  const pairPickNico = ALL_CARS.filter(c => c.owner === "nico" && c.id !== pair[0]?.id && c.id !== pair[1]?.id);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent">
          Rennauto Simulator
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Pick two cars and let them race!</p>
      </div>

      {/* Scoreboard */}
      {scoreboard.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-gray-900/50 border border-gray-700">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Scoreboard</h3>
          <div className="flex flex-wrap gap-3">
            {scoreboard.map((car, i) => (
              <div
                key={car.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  i === 0 && (scores[car.id] || 0) > 0
                    ? "border-yellow-500/50 bg-yellow-900/20"
                    : "border-gray-700 bg-gray-800/50"
                }`}
              >
                <div className="w-8 h-8 relative rounded overflow-hidden flex-shrink-0" style={{ borderColor: car.color, borderWidth: 2 }}>
                  <Image src={car.image} alt={car.name} fill className="object-cover" />
                </div>
                <span className="text-sm font-bold" style={{ color: car.color }}>{car.name}</span>
                <span className="text-lg font-black text-white ml-1">{scores[car.id] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pick Pair */}
      {phase === "pick-pair" && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {([0, 1] as const).map(slot => (
              <div key={slot} className="rounded-xl border-2 border-dashed border-gray-600 p-4 text-center min-h-[180px] flex flex-col items-center justify-center">
                <p className="text-sm text-gray-400 mb-2 uppercase tracking-wider">Lane {slot + 1}</p>
                {pair[slot] ? (
                  <div>
                    <div className="w-28 h-28 relative rounded-lg overflow-hidden mx-auto" style={{ borderColor: pair[slot]!.color, borderWidth: 3 }}>
                      <Image src={pair[slot]!.image} alt={pair[slot]!.name} fill className="object-cover" />
                    </div>
                    <p className="font-bold mt-2" style={{ color: pair[slot]!.color }}>{pair[slot]!.name}</p>
                    <button onClick={() => { const n: [Car | null, Car | null] = [...pair]; n[slot] = null; setPair(n); }} className="text-xs text-red-400 hover:text-red-300 mt-1">Remove</button>
                  </div>
                ) : (
                  <p className="text-gray-500">Pick a car below</p>
                )}
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold text-gray-300 mb-4">Choose your two racers:</h2>
          <CarGrid cars={pairPickTommy} title="Tommy's Cars" ownerColor="#f97316" />
          <CarGrid cars={pairPickNico} title="Nico's Cars" ownerColor="#38bdf8" />
        </>
      )}

      {/* Pre-Race / Racing / Result / Overtime Intro */}
      {(phase === "pre-race" || phase === "racing" || phase === "result" || phase === "overtime-intro") && currentMatchup && (
        <div className={`rounded-2xl p-6 mb-6 ${
          currentMatchup.isOvertime
            ? "bg-red-950/30 border-2 border-red-500/30"
            : "bg-gray-900/50 border border-gray-700"
        }`}>
          {/* Match Label */}
          <div className="text-center mb-4">
            {currentMatchup.isOvertime ? (
              <>
                <p className="text-3xl font-black text-red-500 uppercase tracking-widest overtime-pulse">OVERTIME</p>
                <p className="text-red-400/70 text-sm">{currentMatchup.label}</p>
              </>
            ) : (
              <p className="text-lg text-gray-400">{currentMatchup.label}</p>
            )}
          </div>

          {/* Overtime Intro */}
          {phase === "overtime-intro" && (
            <div className="text-center py-6">
              <div className="flex items-center justify-center gap-8 mb-6">
                {currentMatchup.cars.map(car => (
                  <div key={car.id} className="text-center">
                    <div className="w-24 h-24 relative rounded-lg overflow-hidden mx-auto" style={{ borderColor: car.color, borderWidth: 3 }}>
                      <Image src={car.image} alt={car.name} fill className="object-cover" />
                    </div>
                    <p className="font-bold mt-1" style={{ color: car.color }}>{car.name}</p>
                    <p className="text-white font-black">{scores[car.id] || 0} pts</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 mb-4">Winner gets +1 point. Loser stays at {scores[currentMatchup.cars[0].id] || 0}.</p>
              <button onClick={startRace} className="px-10 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white font-bold text-xl rounded-xl hover:from-red-600 hover:to-red-400 transition-all">
                START OVERTIME!
              </button>
            </div>
          )}

          {/* Pre-Race */}
          {phase === "pre-race" && (
            <div className="text-center py-6">
              <div className="flex items-center justify-center gap-8 mb-6">
                {currentMatchup.cars.map(car => (
                  <div key={car.id} className="text-center">
                    <div className="w-28 h-28 relative rounded-lg overflow-hidden mx-auto" style={{ borderColor: car.color, borderWidth: 3 }}>
                      <Image src={car.image} alt={car.name} fill className="object-cover" />
                    </div>
                    <p className="font-bold text-lg mt-2" style={{ color: car.color }}>{car.name}</p>
                    <p className="text-gray-400 text-sm">{scores[car.id] || 0} pt{(scores[car.id] || 0) !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
              <button onClick={startRace} className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold text-2xl rounded-xl hover:from-green-500 hover:to-green-400 transition-all transform hover:scale-105 active:scale-95">
                START RACE!
              </button>
            </div>
          )}

          {/* Race Tracks */}
          {(phase === "racing" || phase === "result") && (
            <div className="space-y-4">
              {([0, 1] as const).map(idx => {
                const car = currentMatchup.cars[idx];
                const pos = Math.min(positions[idx], 100);
                const isWinner = winner === idx;
                return (
                  <div key={idx}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-10 h-10 relative rounded overflow-hidden flex-shrink-0 ${isWinner && phase === "result" ? "winner-glow" : ""}`} style={{ borderColor: car.color, borderWidth: 2 }}>
                        <Image src={car.image} alt={car.name} fill className="object-cover" />
                      </div>
                      <span className="font-bold" style={{ color: car.color }}>{car.name}</span>
                      <span className="text-gray-500 text-sm">{scores[car.id] || 0} pts</span>
                      {phase === "result" && isWinner && <span className="text-yellow-400 font-bold">WINNER! +1</span>}
                      {phase === "result" && !isWinner && <span className="text-gray-500">lost</span>}
                    </div>
                    <div className="race-track h-16 rounded-lg relative overflow-hidden">
                      <div className="absolute right-0 top-0 bottom-0 w-3" style={{ background: "repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 10px 10px" }} />
                      <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-75" style={{ left: `${pos * 0.9}%` }}>
                        <div className="w-14 h-14 relative rounded-lg overflow-hidden border-2" style={{ borderColor: car.color }}>
                          <Image src={car.image} alt={car.name} fill className="object-cover" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {phase === "result" && (
                <div className="text-center mt-6">
                  <button onClick={handleContinue} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors text-lg">
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Races */}
      {matchupQueue.length > 0 && (phase === "pre-race" || phase === "racing" || phase === "result" || phase === "overtime-intro") && (
        <div className="mb-6 p-3 bg-gray-900/30 rounded-lg border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Up next</p>
          {matchupQueue.map((m, i) => (
            <p key={i} className="text-sm text-gray-400">
              {m.isOvertime ? "OVERTIME: " : ""}{m.cars[0].name} vs {m.cars[1].name}
            </p>
          ))}
        </div>
      )}

      {/* Pick Challenger */}
      {phase === "pick-challenger" && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {([0, 1] as const).map(slot => {
              const car = pair[slot];
              if (!car) return null;
              const isWinner = slot === pairWinnerIdx;
              return (
                <div key={slot} className={`rounded-xl border-2 p-4 text-center ${isWinner ? "border-yellow-500/50 bg-yellow-900/10" : "border-gray-700 bg-gray-900/30"}`}>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Lane {slot + 1} {isWinner ? "- Winner" : "- Loser"}
                  </p>
                  <div className="w-24 h-24 relative rounded-lg overflow-hidden mx-auto" style={{ borderColor: car.color, borderWidth: 3 }}>
                    <Image src={car.image} alt={car.name} fill className="object-cover" />
                  </div>
                  <p className="font-bold mt-1" style={{ color: car.color }}>{car.name}</p>
                  <p className="text-white font-black">{scores[car.id] || 0} pts</p>
                </div>
              );
            })}
          </div>

          <h2 className="text-xl font-bold text-gray-300 mb-4">Pick a challenger:</h2>
          <p className="text-sm text-gray-500 mb-4">
            {pair[pairWinnerIdx]?.name} (winner) races first, then {pair[1 - pairWinnerIdx]?.name} (loser).
          </p>
          <CarGrid cars={tommyChallengers} title="Tommy's Cars" ownerColor="#f97316" />
          <CarGrid cars={nicoChallengers} title="Nico's Cars" ownerColor="#38bdf8" />
        </>
      )}

      {/* Game Over */}
      {phase === "game-over" && (
        <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-yellow-900/40 to-transparent border border-yellow-500/50 mb-8">
          <h2 className="text-4xl font-bold text-yellow-400 mb-4">TOURNAMENT OVER!</h2>
          <div className="space-y-3 max-w-md mx-auto">
            {scoreboard.map((car, i) => (
              <div key={car.id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? "bg-yellow-900/30 border border-yellow-500/50" : "bg-gray-800/50 border border-gray-700"}`}>
                <span className="text-2xl font-black w-8 text-right" style={{ color: i === 0 ? "#facc15" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7f32" : "#666" }}>
                  {i + 1}.
                </span>
                <div className={`w-12 h-12 relative rounded-lg overflow-hidden flex-shrink-0 ${i === 0 ? "winner-glow" : ""}`} style={{ borderColor: car.color, borderWidth: 2 }}>
                  <Image src={car.image} alt={car.name} fill className="object-cover" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold" style={{ color: car.color }}>{car.name}</p>
                  <p className="text-xs" style={{ color: car.owner === "tommy" ? "#f97316" : "#38bdf8" }}>
                    {car.owner === "tommy" ? "Tommy" : "Nico"}
                  </p>
                </div>
                <span className="text-2xl font-black text-white">{scores[car.id] || 0}</span>
              </div>
            ))}
          </div>
          <button onClick={resetGame} className="mt-6 px-8 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors text-lg">
            Play Again
          </button>
        </div>
      )}

      {/* Race Log */}
      {raceLog.length > 0 && (
        <div className="mt-4 p-3 bg-black/30 rounded-lg max-h-40 overflow-y-auto border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Race Log</p>
          {raceLog.map((msg, i) => (
            <p key={i} className="text-sm text-gray-400">{msg}</p>
          ))}
        </div>
      )}

      {/* Reset */}
      <div className="text-center mt-8">
        <button onClick={resetGame} className="text-sm text-gray-600 hover:text-gray-400 transition-colors">
          Reset Game
        </button>
      </div>
    </div>
  );
}
