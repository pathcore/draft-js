/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 * @emails oncall+draft_js
 */

'use strict';

import type {DraftEntityType} from '../entity/DraftEntityType';
import type {DraftEntityMutability} from '../entity/DraftEntityMutability';

const Immutable = require('immutable');
const invariant = require('invariant');

const {OrderedMap, Record} = Immutable;

const DraftEntityInstance = require('DraftEntityInstance');

const defaultRecord: {
  _instanceKey: number,
  _entities: OrderedMap<string, DraftEntityInstance>,
} = {
  _instanceKey: 0,
  _entities: OrderedMap(),
};

const EntityMapRecord = (Record(defaultRecord): any);

class EntityMap extends EntityMapRecord {
  getLastCreatedEntityKey(): string {
    return this.get('_entities')
      .keySeq()
      .last();
  }

  getEntity(key: string): DraftEntityInstance {
    const entity = this.get('_entities').get(key);
    invariant(!!entity, 'Unknown DraftEntity key: %s.', key);
    return entity;
  }

  add(instance: DraftEntityInstance): EntityMap {
    const key = this.get('_instanceKey') + 1;
    return this.set('_instanceKey', key).setIn(
      ['_entities', '' + key],
      instance,
    );
  }

  addAtKey(key: string, instance: DraftEntityInstance): EntityMap {
    return this.update('_instanceKey', key => key + 1).setIn(
      ['_entities', key],
      instance,
    );
  }

  create(
    type: DraftEntityType,
    mutability: DraftEntityMutability,
    data?: Object,
  ): EntityMap {
    return this.add(
      new DraftEntityInstance({type, mutability, data: data || {}}),
    );
  }

  merge(other: EntityMap): EntityMap {
    return this.update('_entities', ourEntities =>
      ourEntities.merge(other.get('_entities')),
    );
  }

  mergeData(key: string, toMerge: {[key: string]: any, ...}): EntityMap {
    return this.updateIn(['_entities', key, 'data'], existingData => ({
      ...existingData,
      ...toMerge,
    }));
  }

  replaceData(key: string, newData: {[key: string]: any, ...}): EntityMap {
    return this.setIn(['_entities', key, 'data'], newData);
  }
}

module.exports = EntityMap;
