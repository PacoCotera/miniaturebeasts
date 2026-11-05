import { describe, expect, it } from 'vitest'
import { P } from './words'

describe('the copywriter\'s play words', () => {
  it('names a paint pot by its hue', () => {
    const tuliko = [180, 205.714286, 231.428571, 257.142857, 282.857143, 308.571429, 334.285714, 360]
    expect(tuliko.map(P.pot)).toEqual(['Teal', 'Sky blue', 'Blue', 'Violet', 'Purple', 'Berry', 'Pink', 'Red'])
    expect([0, 14.9, 15, 45, 70, 160, 193, 218, 244, 270, 296, 321, 347, 359].map(P.pot)).toEqual(['Red', 'Red', 'Orange', 'Yellow', 'Green', 'Teal', 'Sky blue', 'Blue', 'Violet', 'Purple', 'Berry', 'Pink', 'Red', 'Red'])
  })
  it('names each end of a toy for what it shows', () => {
    expect([P.toyEnd('body.size', 'Body', 'first'), P.toyEnd('body.size', 'Body', 'last'), P.toyEnd('tail.curl', 'Tail', 'last'), P.toyEnd('ears.size', 'Ears', 'first')]).toEqual(['Slim body', 'Round body', 'Curly tail', 'Small ears'])
    expect([P.toyEnd('wings.span', 'Wings', 'first'), P.toyEnd('wings.span', 'Wings', 'last')]).toEqual(['Wings: a little', 'Wings: a lot'])
  })
  it('counts the kept mibis for a screen reader and says where back goes', () => {
    expect([0, 1, 4].map(P.count)).toEqual(['none yet', '1 kept', '4 kept'])
    expect([P.backShape, P.backPods('Pemmi'), P.podsSub('Tulikos')]).toEqual(['Pick another mibi', 'Back to Pemmi', 'young Tulikos'])
  })
})
