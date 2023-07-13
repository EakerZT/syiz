export class ValidatorType {
  _required: boolean = false

  required () {
    this._required = false
    return this
  }
}

export class ValidatorObject extends ValidatorType {
  _children: Record<string, ValidatorType> = {}

  map (map: Record<string, ValidatorType>) {
    this._children = map
    return this
  }
}

export class ValidatorArray extends ValidatorType {
  _element: Record<string, ValidatorType> = {}

  element (e: Record<string, ValidatorType>) {
    this._element = e
    return this
  }
}

export class ValidatorString extends ValidatorType {
  _min: number | undefined = undefined
  _max: number | undefined = undefined

  min (num: number) {
    this._min = num
    return this
  }

  max (num: number) {
    this._max = num
    return this
  }
}

export class ValidatorNumber extends ValidatorType {
  _min: number | undefined = undefined
  _max: number | undefined = undefined

  min (num: number) {
    this._min = num
    return this
  }

  max (num: number) {
    this._max = num
    return this
  }
}
