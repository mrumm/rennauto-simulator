"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";

interface Car {
  id: string;
  name: string;
  image: string;
  color: string;
  owner: "tommy" | "nico";
}

const ALL_CARS: Car[] = [
  // Tommy's cars
  { id: "chrome", name: "Chrome", image: "/cars/chrome.jpeg", color: "#f97316", owner: "tommy" },
  { id: "haas", name: "Haas", image: "/cars/haas.jpeg", color: "#dc2626", owner: "tommy" },
  { id: "alpine", name: "Alpine", image: "/cars/alpine.jpeg", color: "#ec4899", owner: "tommy" },
  { id: "visa", name: "VISA", image: "/cars/visa.jpeg", color: "#3b82f6", owner: "tommy" },
  { id: "kick", name: "Kick", image: "/cars/kick.jpeg", color: "#22c55e", owner: "tommy" },
  { id: "golden-thunder", name: "Golden Thunder", image: "/cars/golden-thunder.jpeg", color: "#eab308", owner: "tommy" },
  { id: "phantom-blaze", name: "Phantom Blaze", image: "/cars/phantom-blaze.jpeg", color: "#d946ef", owner: "tommy" },
  // Nico's cars
  { id: "kowloon-hypervan", name: "Kowloon Hypervan", image: "/cars/nico/kowloon-hypervan.jpeg", color: "#22c55e", owner: "nico" },
  { id: "yellow-rocket", name: "Yellow Rocket", image: "/cars/nico/yellow-rocket.jpeg", color: "#facc15", owner: "nico" },
  { id: "silver-68", name: "Silver 68", image: "/cars/nico/silver-68.jpeg", color: "#94a3b8", owner: "nico" },
  { id: "mario-kart", name: "Mario Kart", image: "/cars/nico/mario-kart.jpeg", color: "#ef4444", owner: "nico" },
  { id: "popper-wheelie", name: "Popper Wheelie", image: "/cars/nico/popper-wheelie.jpeg", color: "#3b82f6", owner: "nico" },
  { id: "white-stallion", name: "White Stallion", image: "/cars/nico/white-stallion.jpeg", color: "#f8fafc", owner: "nico" },
  { id: "red-rocket", name: "Red Rocket", image: "/cars/nico/red-rocket.jpeg", color: "#ef4444", owner: "nico" },
];

type GamePhase = "pick-both" | "pick-replacement" | "ready" | "racing" | "overtime-intro" | "overtime" | "result" | "eliminated";

export default function Home() {
  const [availableCars, setAvailableCars] = useState<Car[]>([...ALL_CARS]);
  const [lanes, setLanes] = useState<[Car | null, Car | null]>([null, null]);
  const [losses, setLosses] = useState<[number, number]>([0, 0]);
  const [phase, setPhase] = useState<GamePhase>("pick-both");
  const [positions, setPositions] = useState<[number, number]>([0, 0]);
  const [winner, setWinner] = useState<number | null>(null);
  const [overtimeRound, setOvertimeRound] = useState(0);
  const [raceLog, setRaceLog] = useState<string[]>([]);
  const [eliminatedCars, setEliminatedCars] = useState<Car[]>([]);
  const [replaceLane, setReplaceLane] = useState<0 | 1>(0);
  const raceInterval = useRef<NodeJS.Timeout | null>(null);

  const unassignedCars = availableCars.filter(
    c => c.id !== lanes[0]?.id && c.id !== lanes[1]?.id
  );

  const tommyCars = unassignedCars.filter(c => c.owner === "tommy");
  const nicoCars = unassignedCars.filter(c => c.owner === "nico");

  const assignToLane = (car: Car, slot: 0 | 1) => {
    const newLanes: [Car | null, Car | null] = [...lanes];
    if (newLanes[1 - slot]?.id === car.id) return;
    newLanes[slot] = car;
    setLanes(newLanes);

    if (phase === "pick-both") {
      const otherSlot = 1 - slot;
      if (newLanes[otherSlot] !== null) {
        setPhase("ready");
      }
    } else if (phase === "pick-replacement") {
      setLosses(prev => {
        const n: [number, number] = [...prev];
        n[slot] = 0;
        return n;
      });
      setPhase("ready");
    }
  };

  const removeLaneCar = (slot: 0 | 1) => {
    if (phase !== "pick-both") return;
    const newLanes: [Car | null, Car | null] = [...lanes];
    newLanes[slot] = null;
    setLanes(newLanes);
    setPhase("pick-both");
  };

  const runRace = useCallback((isOvertime: boolean) => {
    setPositions([0, 0]);
    setWinner(null);
    setPhase(isOvertime ? "overtime" : "racing");

    const pos: [number, number] = [0, 0];
    const speed = isOvertime ? 2.5 : 1.5;
    const finishLine = 100;

    raceInterval.current = setInterval(() => {
      pos[0] += Math.random() * speed + 0.3;
      pos[1] += Math.random() * speed + 0.3;
      setPositions([...pos] as [number, number]);

      if (pos[0] >= finishLine || pos[1] >= finishLine) {
        clearInterval(raceInterval.current!);

        let raceWinner: number | null = null;
        if (pos[0] >= finishLine && pos[1] >= finishLine) {
          const diff = Math.abs(pos[0] - pos[1]);
          if (diff < 1) {
            raceWinner = null;
          } else {
            raceWinner = pos[0] > pos[1] ? 0 : 1;
          }
        } else if (pos[0] >= finishLine) {
          raceWinner = 0;
        } else {
          raceWinner = 1;
        }

        if (raceWinner === null && isOvertime) {
          setTimeout(() => {
            setOvertimeRound(r => r + 1);
            runRace(true);
          }, 1500);
          setRaceLog(prev => [...prev, "Overtime tie! Racing again..."]);
          return;
        }

        setWinner(raceWinner);
        setPhase("result");
      }
    }, 50);
  }, []);

  const startRace = () => {
    if (!lanes[0] || !lanes[1]) return;
    setOvertimeRound(0);
    runRace(false);
  };

  const startOvertime = () => {
    setOvertimeRound(1);
    runRace(true);
  };

  const handleRaceResult = () => {
    if (winner === null) {
      setRaceLog(prev => [...prev, "It's a TIE! Overtime!"]);
      setPhase("overtime-intro");
      return;
    }

    const winnerCar = lanes[winner]!;
    const loserIdx = (winner === 0 ? 1 : 0) as 0 | 1;
    const loserCar = lanes[loserIdx]!;

    setRaceLog(prev => [...prev, `${winnerCar.name} wins! ${loserCar.name} gets a loss.`]);

    const newLosses: [number, number] = [...losses];
    newLosses[loserIdx] += 1;
    setLosses(newLosses);

    if (newLosses[loserIdx] >= 3) {
      setEliminatedCars(prev => [...prev, loserCar]);
      setAvailableCars(prev => prev.filter(c => c.id !== loserCar.id));
      setRaceLog(prev => [...prev, `${loserCar.name} is ELIMINATED! (3 losses)`]);

      const newLanes: [Car | null, Car | null] = [...lanes];
      newLanes[loserIdx] = null;
      setLanes(newLanes);

      const resetLosses: [number, number] = [0, 0];
      setLosses(resetLosses);

      const remainingUnassigned = availableCars.filter(
        c => c.id !== loserCar.id && c.id !== winnerCar.id
      );
      if (remainingUnassigned.length === 0) {
        setPhase("eliminated");
      } else {
        setReplaceLane(loserIdx);
        setPhase("pick-replacement");
      }
    } else {
      setPhase("ready");
    }
  };

  useEffect(() => {
    return () => {
      if (raceInterval.current) clearInterval(raceInterval.current);
    };
  }, []);

  const resetGame = () => {
    setAvailableCars([...ALL_CARS]);
    setLanes([null, null]);
    setLosses([0, 0]);
    setPhase("pick-both");
    setPositions([0, 0]);
    setWinner(null);
    setOvertimeRound(0);
    setRaceLog([]);
    setEliminatedCars([]);
  };

  const gameOver = phase === "eliminated" || availableCars.length <= 1;
  const finalWinner = lanes[0] || lanes[1];

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
                if (phase === "pick-both") {
                  const firstEmpty = lanes[0] === null ? 0 : lanes[1] === null ? 1 : null;
                  if (firstEmpty !== null) assignToLane(car, firstEmpty as 0 | 1);
                } else if (phase === "pick-replacement") {
                  assignToLane(car, replaceLane);
                }
              }}
              className="p-3 rounded-xl border-2 transition-all border-gray-700 hover:border-gray-400 hover:scale-105 cursor-pointer"
            >
              <div className="w-full aspect-square relative rounded-lg overflow-hidden mb-2">
                <Image src={car.image} alt={car.name} fill className="object-cover" />
              </div>
              <p className="font-bold text-sm" style={{ color: car.color }}>
                {car.name}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent">
          Rennauto Simulator
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Pick two cars and let them race!</p>
      </div>

      {/* Game Over */}
      {gameOver && finalWinner && (
        <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-yellow-900/40 to-transparent border border-yellow-500/50 mb-8">
          <h2 className="text-4xl font-bold text-yellow-400 mb-2">ULTIMATE CHAMPION!</h2>
          <div className="w-48 h-48 mx-auto my-4 relative rounded-xl overflow-hidden winner-glow">
            <Image src={finalWinner.image} alt={finalWinner.name} fill className="object-cover" />
          </div>
          <p className="text-3xl font-bold" style={{ color: finalWinner.color }}>{finalWinner.name}</p>
          <p className="text-sm mt-1" style={{ color: finalWinner.owner === "tommy" ? "#f97316" : "#38bdf8" }}>
            {finalWinner.owner === "tommy" ? "Tommy's car" : "Nico's car"}
          </p>
          <p className="text-gray-400 mt-1">Last car standing!</p>
          <button onClick={resetGame} className="mt-6 px-8 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors text-lg">
            Play Again
          </button>
        </div>
      )}

      {!gameOver && (
        <>
          {/* Lanes */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {([0, 1] as const).map(slot => (
              <div
                key={slot}
                className={`rounded-xl border-2 p-4 text-center min-h-[200px] flex flex-col items-center justify-center transition-all ${
                  phase === "pick-replacement" && slot === replaceLane
                    ? "border-yellow-500 border-dashed bg-yellow-500/5"
                    : lanes[slot]
                    ? "border-gray-700 bg-gray-900/30"
                    : "border-dashed border-gray-600"
                }`}
              >
                <p className="text-sm text-gray-400 mb-2 uppercase tracking-wider">
                  Lane {slot + 1}
                </p>
                {lanes[slot] ? (
                  <div className="relative">
                    <div
                      className="w-32 h-32 relative rounded-lg overflow-hidden mx-auto"
                      style={{ borderColor: lanes[slot]!.color, borderWidth: 3 }}
                    >
                      <Image src={lanes[slot]!.image} alt={lanes[slot]!.name} fill className="object-cover" />
                    </div>
                    <p className="font-bold text-lg mt-2" style={{ color: lanes[slot]!.color }}>
                      {lanes[slot]!.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: lanes[slot]!.owner === "tommy" ? "#f97316" : "#38bdf8" }}>
                      {lanes[slot]!.owner === "tommy" ? "Tommy" : "Nico"}
                    </p>
                    {/* Loss indicators */}
                    <div className="flex gap-1.5 justify-center mt-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full border ${
                            i < losses[slot] ? "bg-red-500 border-red-400" : "bg-gray-700 border-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    {phase === "pick-both" && (
                      <button
                        onClick={() => removeLaneCar(slot)}
                        className="text-xs text-red-400 hover:text-red-300 mt-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    {phase === "pick-replacement" && slot === replaceLane
                      ? "Pick a replacement!"
                      : "Pick a car below"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Start Race Button */}
          {phase === "ready" && (
            <div className="text-center mb-6">
              <button
                onClick={startRace}
                className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold text-2xl rounded-xl hover:from-green-500 hover:to-green-400 transition-all transform hover:scale-105 active:scale-95"
              >
                START RACE!
              </button>
            </div>
          )}

          {/* Race View */}
          {(phase === "racing" || phase === "overtime" || phase === "result" || phase === "overtime-intro") && lanes[0] && lanes[1] && (
            <div className={`rounded-2xl p-6 mb-6 ${
              phase === "overtime" || phase === "overtime-intro"
                ? "bg-red-950/30 border-2 border-red-500/30"
                : "bg-gray-900/50 border border-gray-700"
            }`}>
              {/* Overtime Banner */}
              {(phase === "overtime" || phase === "overtime-intro") && (
                <div className="text-center mb-4">
                  <p className="text-3xl font-black text-red-500 uppercase tracking-widest overtime-pulse">
                    OVERTIME{overtimeRound > 1 ? ` - Round ${overtimeRound}` : ""}
                  </p>
                  <p className="text-red-400/70 text-sm">First to win takes it all!</p>
                </div>
              )}

              {/* Overtime Intro */}
              {phase === "overtime-intro" && (
                <div className="text-center py-8">
                  <p className="text-2xl text-yellow-400 mb-6">The race was a TIE!</p>
                  <p className="text-gray-400 mb-6">In overtime, the first car to win a race takes the victory.</p>
                  <button
                    onClick={startOvertime}
                    className="px-10 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white font-bold text-xl rounded-xl hover:from-red-600 hover:to-red-400 transition-all"
                  >
                    START OVERTIME!
                  </button>
                </div>
              )}

              {/* Race Tracks */}
              {phase !== "overtime-intro" && (
                <div className="space-y-4">
                  {([0, 1] as const).map(idx => {
                    const car = lanes[idx]!;
                    const pos = Math.min(positions[idx], 100);
                    const isWinner = winner === idx;
                    return (
                      <div key={idx}>
                        <div className="flex items-center gap-3 mb-1">
                          <div
                            className={`w-10 h-10 relative rounded overflow-hidden flex-shrink-0 ${
                              isWinner && phase === "result" ? "winner-glow" : ""
                            }`}
                            style={{ borderColor: car.color, borderWidth: 2 }}
                          >
                            <Image src={car.image} alt={car.name} fill className="object-cover" />
                          </div>
                          <span className="font-bold" style={{ color: car.color }}>{car.name}</span>
                          <div className="flex gap-1 ml-1">
                            {[0, 1, 2].map(i => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < losses[idx] ? "bg-red-500" : "bg-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                          {isWinner && phase === "result" && (
                            <span className="text-yellow-400 font-bold">WINNER!</span>
                          )}
                          {winner !== null && !isWinner && phase === "result" && (
                            <span className="text-gray-500">lost</span>
                          )}
                          {winner === null && phase === "result" && (
                            <span className="text-yellow-400">TIE!</span>
                          )}
                        </div>
                        <div className="race-track h-16 rounded-lg relative overflow-hidden">
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3"
                            style={{
                              background:
                                "repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 10px 10px",
                            }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 transition-all duration-75"
                            style={{ left: `${pos * 0.9}%` }}
                          >
                            <div
                              className="w-14 h-14 relative rounded-lg overflow-hidden border-2"
                              style={{ borderColor: car.color }}
                            >
                              <Image src={car.image} alt={car.name} fill className="object-cover" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Result Button */}
              {phase === "result" && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleRaceResult}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors text-lg"
                  >
                    {winner === null ? "Go to Overtime!" : "Continue"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Car Picker */}
          {(phase === "pick-both" || phase === "pick-replacement") && (
            <>
              <h2 className="text-xl font-bold text-gray-300 mb-4">
                {phase === "pick-replacement" ? "Pick a challenger:" : "Choose your racers:"}
              </h2>
              <CarGrid cars={tommyCars} title="Tommy's Cars" ownerColor="#f97316" />
              <CarGrid cars={nicoCars} title="Nico's Cars" ownerColor="#38bdf8" />
            </>
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

          {/* Eliminated Cars */}
          {eliminatedCars.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Eliminated</h3>
              <div className="flex gap-2 flex-wrap">
                {eliminatedCars.map(car => (
                  <div
                    key={car.id}
                    className="flex items-center gap-2 bg-red-900/20 rounded-lg px-3 py-1.5 border border-red-900/30"
                  >
                    <div className="w-8 h-8 relative rounded overflow-hidden opacity-50">
                      <Image src={car.image} alt={car.name} fill className="object-cover grayscale" />
                    </div>
                    <span className="text-sm text-red-400/70 line-through">{car.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
