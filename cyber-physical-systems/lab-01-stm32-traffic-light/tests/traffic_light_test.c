#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "../project/Core/Inc/main.h"

GPIO_TypeDef mock_gpio_b;
static uint32_t mock_tick;
static uint32_t output_bits;
static GPIO_PinState button_state = GPIO_PIN_SET;

void HAL_Init(void) {}
uint32_t HAL_GetTick(void) { return mock_tick; }
void HAL_Delay(uint32_t ms) { mock_tick += ms; }
GPIO_PinState HAL_GPIO_ReadPin(GPIO_TypeDef *port, uint16_t pin) {
  assert(port == GPIOB && pin == GPIO_PIN_5);
  return button_state;
}
void HAL_GPIO_WritePin(GPIO_TypeDef *port, uint16_t pin, GPIO_PinState state) {
  assert(port == GPIOB);
  if (state == GPIO_PIN_SET) output_bits |= pin;
  else output_bits &= ~pin;
}
void HAL_GPIO_Init(GPIO_TypeDef *port, GPIO_InitTypeDef *settings) {
  assert(port == GPIOB);
  (void)settings;
}
int HAL_RCC_OscConfig(RCC_OscInitTypeDef *settings) { (void)settings; return HAL_OK; }
int HAL_RCC_ClockConfig(RCC_ClkInitTypeDef *settings, uint32_t latency) {
  (void)settings; (void)latency; return HAL_OK;
}

#define main firmware_main
#include "../project/Core/Src/main.c"
#undef main

static void step(uint32_t at) {
  mock_tick = at;
  TrafficController_Update();
  assert(!((output_bits & CAR_GREEN_Pin) && (output_bits & PED_GREEN_Pin)));
}

int main(void) {
  EnterState(TRAFFIC_CAR_GREEN, 0);
  assert((output_bits & (CAR_GREEN_Pin | PED_RED_Pin)) == (CAR_GREEN_Pin | PED_RED_Pin));

  button_state = GPIO_PIN_RESET;
  step(100);
  assert(traffic_state == TRAFFIC_CAR_GREEN);
  step(3000);
  assert(traffic_state == TRAFFIC_CAR_YELLOW);
  button_state = GPIO_PIN_SET;
  step(5000);
  assert(traffic_state == TRAFFIC_ALL_RED_TO_PEDESTRIANS);
  step(6000);
  assert(traffic_state == TRAFFIC_PEDESTRIAN_GREEN);
  step(13000);
  assert(traffic_state == TRAFFIC_PEDESTRIAN_BLINK);
  step(17000);
  assert(traffic_state == TRAFFIC_ALL_RED_TO_CARS);
  step(18000);
  assert(traffic_state == TRAFFIC_CAR_GREEN);
  puts("traffic light state sequence: ok");
  return 0;
}
