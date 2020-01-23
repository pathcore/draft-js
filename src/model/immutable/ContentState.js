/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 * @emails oncall+draft_js
 */

'use strict';

import type {BlockMap} from 'BlockMap';
import type {BlockNodeRecord} from 'BlockNodeRecord';
import type {DraftEntityMutability} from 'DraftEntityMutability';
import type {DraftEntityType} from 'DraftEntityType';

const BlockMapBuilder = require('BlockMapBuilder');
const CharacterMetadata = require('CharacterMetadata');
const ContentBlock = require('ContentBlock');
const ContentBlockNode = require('ContentBlockNode');
const DraftEntityInstance = require('DraftEntityInstance');
const EntityMap = require('EntityMap');
const SelectionState = require('SelectionState');

const generateRandomKey = require('generateRandomKey');
const gkx = require('gkx');
const Immutable = require('immutable');
const sanitizeDraftText = require('sanitizeDraftText');

const {List, Record, Repeat} = Immutable;

const defaultRecord: {
  entityMap: ?EntityMap,
  blockMap: ?BlockMap,
  selectionBefore: ?SelectionState,
  selectionAfter: ?SelectionState,
  ...
} = {
  entityMap: null,
  blockMap: null,
  selectionBefore: null,
  selectionAfter: null,
};

const ContentStateRecord = (Record(defaultRecord): any);

class ContentState extends ContentStateRecord {
  getEntityMap(): EntityMap {
    return this.get('entityMap');
  }

  getBlockMap(): BlockMap {
    return this.get('blockMap');
  }

  getSelectionBefore(): SelectionState {
    return this.get('selectionBefore');
  }

  getSelectionAfter(): SelectionState {
    return this.get('selectionAfter');
  }

  getBlockForKey(key: string): BlockNodeRecord {
    const block: BlockNodeRecord = this.getBlockMap().get(key);
    return block;
  }

  getKeyBefore(key: string): ?string {
    return this.getBlockMap()
      .reverse()
      .keySeq()
      .skipUntil(v => v === key)
      .skip(1)
      .first();
  }

  getKeyAfter(key: string): ?string {
    return this.getBlockMap()
      .keySeq()
      .skipUntil(v => v === key)
      .skip(1)
      .first();
  }

  getBlockAfter(key: string): ?BlockNodeRecord {
    return this.getBlockMap()
      .skipUntil((_, k) => k === key)
      .skip(1)
      .first();
  }

  getBlockBefore(key: string): ?BlockNodeRecord {
    return this.getBlockMap()
      .reverse()
      .skipUntil((_, k) => k === key)
      .skip(1)
      .first();
  }

  getBlocksAsArray(): Array<BlockNodeRecord> {
    return this.getBlockMap().toArray();
  }

  getFirstBlock(): BlockNodeRecord {
    return this.getBlockMap().first();
  }

  getLastBlock(): BlockNodeRecord {
    return this.getBlockMap().last();
  }

  getPlainText(delimiter?: string): string {
    return this.getBlockMap()
      .map(block => {
        return block ? block.getText() : '';
      })
      .join(delimiter || '\n');
  }

  getLastCreatedEntityKey(): string {
    return this.getEntityMap().getLastCreatedEntityKey();
  }

  hasText(): boolean {
    const blockMap = this.getBlockMap();
    return (
      blockMap.size > 1 ||
      // make sure that there are no zero width space chars
      escape(blockMap.first().getText()).replace(/%u200B/g, '').length > 0
    );
  }

  createEntity(
    type: DraftEntityType,
    mutability: DraftEntityMutability,
    data?: Object,
  ): ContentState {
    return this.addEntity(
      new DraftEntityInstance({type, mutability, data: data || {}}),
    );
  }

  mergeEntityData(
    key: string,
    toMerge: {[key: string]: any, ...},
  ): ContentState {
    return this.set('entityMap', this.getEntityMap().mergeData(key, toMerge));
  }

  replaceEntityData(
    key: string,
    newData: {[key: string]: any, ...},
  ): ContentState {
    return this.set('entityMap', this.getEntityMap().replaceData(key, newData));
  }

  addEntity(instance: DraftEntityInstance): ContentState {
    return this.set('entityMap', this.getEntityMap().add(instance));
  }

  getEntity(key: string): DraftEntityInstance {
    return this.getEntityMap().getEntity(key);
  }

  static createFromBlockArray(
    blocks:
      | Array<BlockNodeRecord>
      | {contentBlocks: Array<BlockNodeRecord>, ...},
    entityMap: ?EntityMap,
  ): ContentState {
    const theBlocks = Array.isArray(blocks) ? blocks : blocks.contentBlocks;
    const blockMap = BlockMapBuilder.createFromArray(theBlocks);
    const selectionState = blockMap.isEmpty()
      ? new SelectionState()
      : SelectionState.createEmpty(blockMap.first().getKey());
    return new ContentState({
      blockMap,
      entityMap: entityMap || new EntityMap(),
      selectionBefore: selectionState,
      selectionAfter: selectionState,
    });
  }

  static createFromText(
    text: string,
    delimiter: string | RegExp = /\r\n?|\n/g,
  ): ContentState {
    const strings = text.split(delimiter);
    const blocks = strings.map(block => {
      block = sanitizeDraftText(block);
      const ContentBlockNodeRecord = gkx('draft_tree_data_support')
        ? ContentBlockNode
        : ContentBlock;
      return new ContentBlockNodeRecord({
        key: generateRandomKey(),
        text: block,
        type: 'unstyled',
        characterList: List(Repeat(CharacterMetadata.EMPTY, block.length)),
      });
    });
    return ContentState.createFromBlockArray(blocks);
  }
}

module.exports = ContentState;
