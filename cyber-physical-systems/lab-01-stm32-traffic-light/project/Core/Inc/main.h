/* USER CODE BEGIN Header */
/**
  * @file           : main.h
  * @brief          : Traffic light laboratory project.
  */
/* USER CODE END Header */
#ifndef __MAIN_H
#define __MAIN_H

#ifdef __cplusplus
extern "C" {
#endif

#include "stm32f1xx_hal.h"

#define CAR_RED_Pin       GPIO_PIN_0
#define CAR_RED_GPIO_Port GPIOB
#define CAR_YELLOW_Pin       GPIO_PIN_1
#define CAR_YELLOW_GPIO_Port GPIOB
#define CAR_GREEN_Pin       GPIO_PIN_2
#define CAR_GREEN_GPIO_Port GPIOB
#define PED_RED_Pin       GPIO_PIN_3
#define PED_RED_GPIO_Port GPIOB
#define PED_GREEN_Pin       GPIO_PIN_4
#define PED_GREEN_GPIO_Port GPIOB
#define BUT_Pin       GPIO_PIN_5
#define BUT_GPIO_Port GPIOB

void Error_Handler(void);

#ifdef __cplusplus
}
#endif

#endif /* __MAIN_H */
