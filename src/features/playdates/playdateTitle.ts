import { Playdate } from '../../services/playdateService';

/** What a playdate is called on screen: its title, else its place — with a paw for a 1:1 walk. */
export function playdateTitle(p: Pick<Playdate, 'title' | 'parkName' | 'walk'>): string {
  const name = p.title ?? p.parkName;
  return p.walk ? `🐾 ${name}` : name;
}
