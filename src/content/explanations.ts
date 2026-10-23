import { MatchEventType } from '../core/matchEventBus';

export interface ExplanationVariant {
  kid: string;
  casual: string;
  expert: string;
}

export interface ToneExplanations {
  serious: ExplanationVariant;
  hype: ExplanationVariant;
  comedian: ExplanationVariant;
}

export const MATCH_EVENT_EXPLANATIONS: Record<MatchEventType, ToneExplanations> = {
  OFFSIDE: {
    serious: {
      kid: "The attacker ran ahead of the other team's last defender before the ball was passed!",
      casual: "Offside call: the forward was caught behind the defensive backline when the pass was released.",
      expert: "Rule 11 violation: attacker's playable body part was in the opponent's half and nearer to the goal line than the second-last opponent at point of ball release.",
    },
    hype: {
      kid: "WHOOSH! Caught in the offside trap! Back up, speedy!",
      casual: "Flag is UP! Mbappé timed that run a split-second too eager! Inches deny glory!",
      expert: "Marginal margin! High defensive compression catches the striker 14cm ahead of the second-last defender's boot!",
    },
    comedian: {
      kid: "He was so eager for cookies he ran into the kitchen before they came out of the oven!",
      casual: "Someone buy that striker a rear-view mirror—he was basically having tea in their penalty box!",
      expert: "Scientifically proven that the linesman's peripheral vision is better than the entire away defense combined.",
    },
  },
  FOUL: {
    serious: {
      kid: "A player tripped or pushed an opponent by accident or carelessness. Free kick awarded.",
      casual: "Reckless challenge: late tackle breaking up the counter-attack, stopping play.",
      expert: "Tactical foul breaking transition momentum. Contact was careless with excessive momentum without contesting ball trajectory.",
    },
    hype: {
      kid: "CRUNCH! Ref blew the whistle—clean tackle missed!",
      casual: "Down he goes! Tactical foul breaks the lightning break! Yellow card territory!",
      expert: "Cynical transition shutdown. Defensive midfielder accepts tactical booking to prevent 3-on-2 overload.",
    },
    comedian: {
      kid: "Oopsie daisy! Someone forgot feet are meant for the ball, not shoelaces!",
      casual: "Give that man an Oscar or a stretcher—he rolled three full revolutions on that lawn!",
      expert: "Newton's Third Law in action: for every late slide tackle, there is an equal and theatrical scream to the sky.",
    },
  },
  GOAL: {
    serious: {
      kid: "GOAL! The ball completely crossed the goal line between the posts and under the crossbar!",
      casual: "Clinical finish into the corner! 1-0 on the scoreboard.",
      expert: "High xG conversion (0.76). Precision diagonal strike beating the keeper at the near post off a 5-pass buildup.",
    },
    hype: {
      kid: "GOOOAAAL! TO THE BACK OF THE NET! UNBELIEVABLE HIT!",
      casual: "BOOM! WHAT A ROCKET! Upper 90 top bins, the stadium is going wild!",
      expert: "Sensational technique! Curled with 2800 RPM rotational spin and an exit velocity of 108 km/h!",
    },
    comedian: {
      kid: "BAM! The net just got a massive hug from the soccer ball!",
      casual: "Call the fire department because that net is smoking hot right now!",
      expert: "The goalkeeper's dive was entirely theoretical and for aesthetic purposes only.",
    },
  },
  HALFTIME: {
    serious: {
      kid: "Halftime break! The first 45 minutes are done. Time for a quick stretch and water!",
      casual: "Halftime whistle: 15-minute intermission for tactical adjustments and fitness break.",
      expert: "End of 1st half: 45:00 + 2:00 stoppage. Expected goals RMA 1.42 vs MCI 0.98. Possession balanced 54%-46%.",
    },
    hype: {
      kid: "HALFTIME CHALLENGE TIME! Let's get up and show our best victory squats!",
      casual: "HALFTIME! Grab your spot—family 30-second fitness blitz starts right now!",
      expert: "Halftime interval! Time to burn match calories and level up your family team index!",
    },
    comedian: {
      kid: "Halftime! Time to stretch before our couch cushions become permanently glued to us!",
      casual: "Halftime: the coach is throwing water bottles in the locker room, so let's do jumping jacks!",
      expert: "Official 15-minute window for tactical sandwich consumption and living room squats.",
    },
  },
  LULL: {
    serious: {
      kid: "Quiet moment in the match while a player ties their shoe. Great time for a quick 20-second family challenge!",
      casual: "Lull in play with slow possession in the midfield. Quick mini-challenge activated.",
      expert: "Low-tempo recycling phase. Ball circulation in deep defensive third with zero progressive pass opportunities.",
    },
    hype: {
      kid: "SLOW MOTION DETECTED! Quick, beat the buzzer with 5 lightning jumping jacks!",
      casual: "Passing it sideways? Boring! Let's jump in with a family halftime power rep showdown!",
      expert: "Tempo dip under 1.2 passes/sec. Optimal micro-window for aerobic engagement challenge.",
    },
    comedian: {
      kid: "The players are jogging slower than a turtle! Let's show them how fast we can jump!",
      casual: "Midfielders are passing backwards so much they might score in their own parking lot. Let's do reps!",
      expert: "Statistically classified as 'watching paint dry'—triggering athletic movement intervention.",
    },
  },
  VAR_CHECK: {
    serious: {
      kid: "The video referees are checking camera angles to make sure the referee made the right call.",
      casual: "VAR Review: checking for a potential penalty or clear and obvious error on the replay monitors.",
      expert: "Video Assistant Referee protocol engaged: reviewing phase of play for clear and obvious error on penalty threshold.",
    },
    hype: {
      kid: "HOLD YOUR BREATH! The TV ref is drawing the lines on the big screens!",
      casual: "DRAMA! The referee is drawing the TV box in the air! This changes everything!",
      expert: "High-stakes review! Multi-angle broadcast sync calibrating parallax angle for crucial penalty box decision.",
    },
    comedian: {
      kid: "The ref is watching instant replay like he's picking a movie on the TV!",
      casual: "Time for everyone in the living room to scream 'I knew it!' at the referee screen!",
      expert: "Three humans in a van 200 miles away are currently arguing about millimeters on a 4K monitor.",
    },
  },
};

export const getExplanationText = (
  type: MatchEventType,
  level: 'kid' | 'casual' | 'expert' = 'casual',
  tone: 'serious' | 'hype' | 'comedian' = 'hype'
): string => {
  const byType = MATCH_EVENT_EXPLANATIONS[type] || MATCH_EVENT_EXPLANATIONS.OFFSIDE;
  const byTone = byType[tone] || byType.hype;
  return byTone[level] || byTone.casual;
};
