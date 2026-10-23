import { MatchEvent } from './matchEventBus';
import { TriviaQuestion } from '../types';

export const generateQuizFromEvent = (event: MatchEvent): TriviaQuestion => {
  const qId = Date.now();

  switch (event.type) {
    case 'OFFSIDE':
      return {
        id: qId,
        question: `In the recent play at minute ${event.time}', why was the attacker ruled OFFSIDE by AI VAR?`,
        options: [
          'The attacker was behind the ball when passed',
          "The attacker was closer to the goal line than the second-last opponent",
          'The goalkeeper was outside the penalty box',
          'The referee simply flipped a coin',
        ],
        correctIndex: 1,
        explanation: "Rule 11 states a player is offside if nearer to the opponent's goal line than both the ball and the second-last opponent when the ball is played.",
        funFact: 'AI semi-automated offside technology tracks 29 body points at 50 times per second!',
      };

    case 'FOUL':
      return {
        id: qId,
        question: `What caused the referee to blow the whistle for a FOUL at minute ${event.time}'?`,
        options: [
          'A careless or reckless challenge tripping an opponent',
          'A player ran faster than 35 km/h',
          'The ball lost air pressure',
          'The coach asked for a timeout',
        ],
        correctIndex: 0,
        explanation: 'Careless, reckless, or excessively forceful contact against an opponent results in a direct free kick or penalty.',
        funFact: 'The fastest recorded yellow card in football history occurred after just 3 seconds of play!',
      };

    case 'VAR_CHECK':
      return {
        id: qId,
        question: 'Under official football regulations, what does the acronym "VAR" stand for?',
        options: [
          'Virtual Athletic Referee',
          'Video Assistant Referee',
          'Visual Action Replay',
          'Velocity Analysis Radar',
        ],
        correctIndex: 1,
        explanation: 'VAR stands for Video Assistant Referee, introduced to review clear and obvious errors.',
        funFact: 'VAR was first officially used in the FIFA World Cup during the 2018 tournament in Russia.',
      };

    case 'GOAL':
      return {
        id: qId,
        question: `For that spectacular goal at minute ${event.time}', what condition must be met for a goal to be awarded?`,
        options: [
          'More than 50% of the ball crosses the goal line',
          'The entire ball completely crosses the goal line between the posts',
          'The ball touches the back netting only',
          'The attacking striker celebrates first',
        ],
        correctIndex: 1,
        explanation: 'A goal is scored when the whole of the ball passes over the goal line, between the goalposts and under the crossbar.',
        funFact: 'Goal-line technology uses 14 high-speed cameras positioned around the stadium roofline to confirm goal decisions in under 1 second.',
      };

    case 'HALFTIME':
    case 'LULL':
    default:
      return {
        id: qId,
        question: 'During a regulation match, how long is the official halftime intermission break?',
        options: ['10 Minutes', '15 Minutes', '20 Minutes', '5 Minutes'],
        correctIndex: 1,
        explanation: 'Law 7 specifies that players are entitled to an interval at half-time not exceeding 15 minutes.',
        funFact: 'Halftime intervals were standardized in the 19th century to allow players to clean the mud off their leather boots.',
      };
  }
};

class QuizEventManager {
  private explainedEvents: MatchEvent[] = [];
  private pendingQuizzes: TriviaQuestion[] = [];

  public recordEvent(event: MatchEvent): TriviaQuestion {
    this.explainedEvents.unshift(event);
    const quiz = generateQuizFromEvent(event);
    this.pendingQuizzes.unshift(quiz);
    return quiz;
  }

  public getPendingQuizzes(): TriviaQuestion[] {
    return [...this.pendingQuizzes];
  }

  public consumeLatestQuiz(): TriviaQuestion | null {
    return this.pendingQuizzes.shift() || null;
  }
}

export const quizEventManager = new QuizEventManager();
