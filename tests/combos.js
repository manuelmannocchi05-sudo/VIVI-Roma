/* Campione di risposte al quiz usato da test e report: copre tutte le durate, ritmi, budget e vari gruppi di interessi. */
const DURATIONS=[["half",null],["one",null],["multi",2],["multi",3],["multi",4],["multi",5],["multi",7]];
const INTEREST_SETS=[["history"],["art"],["night"],["food"],["religious"],["family"],["nature","romantic"],["hidden","local"],["history","art","food"],
  ["history","art","hidden","romantic","nature","food","religious","local","night","family"]];

export function sampleAnswers(){
  const out=[];let i=0;
  const companies=["solo","couple","friends","family"],moods=["iconic","local","peaceful","lively"],walks=["low","medium","high"];
  for(const [duration,days] of DURATIONS)for(const pace of ["slow","balanced","full"])for(const budget of ["low","mid","high"])
    for(const interests of INTEREST_SETS){
      out.push({company:companies[i%4],familiarity:i%2?"often":"first",duration,days,interests:interests.slice(),
        mood:moods[(i>>1)%4],pace,budget,walking:walks[i%3]});
      i++;
    }
  return out;
}
export const expectedDays=a=>a.duration==="multi"?a.days:1;
