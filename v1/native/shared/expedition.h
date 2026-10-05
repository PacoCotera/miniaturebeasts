#ifndef CRITTER_EXPEDITION_H
#define CRITTER_EXPEDITION_H
#include "game_rules.h"
int game_field_valid(const GameState *state);
int game_received_valid(const GameReceivedExpedition *record);
unsigned game_field_site(const GameState *state);
unsigned game_field_source_resource(unsigned source);
unsigned game_field_source_site(unsigned source);
unsigned game_field_initial_units(unsigned source);
int game_field_finite(const GameState *state);
const char *game_field_site_name(unsigned site);
GameResult game_field_start(GameState *state, const GameCommand *command);
GameResult game_field_action(GameState *state, const GameCommand *command);
GameResult game_field_tick(GameState *state, uint32_t now);
void game_field_record(const GameState *state, GameReceivedExpedition *record);
GameResult game_field_unload(GameState *state, const GameCommand *command);
#endif
