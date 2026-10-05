/* USER CODE BEGIN Header */
/**
  * @file           : main.c
  * @brief          : Button-controlled car/pedestrian traffic light.
  */
/* USER CODE END Header */
#include "main.h"

/* USER CODE BEGIN Includes */
/* USER CODE END Includes */

/* USER CODE BEGIN 0 */
typedef enum {
  TRAFFIC_CAR_GREEN,
  TRAFFIC_CAR_YELLOW,
  TRAFFIC_ALL_RED_TO_PEDESTRIANS,
  TRAFFIC_PEDESTRIAN_GREEN,
  TRAFFIC_PEDESTRIAN_BLINK,
  TRAFFIC_ALL_RED_TO_CARS
} TrafficState;

static TrafficState traffic_state = TRAFFIC_CAR_GREEN;
static uint32_t state_started_at;
static uint32_t blink_started_at;
static uint8_t pedestrian_request;
static uint8_t button_latched;

static void SetLights(GPIO_PinState car_red, GPIO_PinState car_yellow,
                      GPIO_PinState car_green, GPIO_PinState ped_red,
                      GPIO_PinState ped_green)
{
  HAL_GPIO_WritePin(CAR_RED_GPIO_Port, CAR_RED_Pin, car_red);
  HAL_GPIO_WritePin(CAR_YELLOW_GPIO_Port, CAR_YELLOW_Pin, car_yellow);
  HAL_GPIO_WritePin(CAR_GREEN_GPIO_Port, CAR_GREEN_Pin, car_green);
  HAL_GPIO_WritePin(PED_RED_GPIO_Port, PED_RED_Pin, ped_red);
  HAL_GPIO_WritePin(PED_GREEN_GPIO_Port, PED_GREEN_Pin, ped_green);
}

static void EnterState(TrafficState next, uint32_t now)
{
  traffic_state = next;
  state_started_at = now;
  switch (next) {
    case TRAFFIC_CAR_GREEN:
      SetLights(GPIO_PIN_RESET, GPIO_PIN_RESET, GPIO_PIN_SET,
                GPIO_PIN_SET, GPIO_PIN_RESET);
      break;
    case TRAFFIC_CAR_YELLOW:
      SetLights(GPIO_PIN_RESET, GPIO_PIN_SET, GPIO_PIN_RESET,
                GPIO_PIN_SET, GPIO_PIN_RESET);
      break;
    case TRAFFIC_ALL_RED_TO_PEDESTRIANS:
      SetLights(GPIO_PIN_SET, GPIO_PIN_RESET, GPIO_PIN_RESET,
                GPIO_PIN_SET, GPIO_PIN_RESET);
      break;
    case TRAFFIC_PEDESTRIAN_GREEN:
      SetLights(GPIO_PIN_SET, GPIO_PIN_RESET, GPIO_PIN_RESET,
                GPIO_PIN_RESET, GPIO_PIN_SET);
      break;
    case TRAFFIC_PEDESTRIAN_BLINK:
      blink_started_at = now;
      SetLights(GPIO_PIN_SET, GPIO_PIN_RESET, GPIO_PIN_RESET,
                GPIO_PIN_RESET, GPIO_PIN_SET);
      break;
    case TRAFFIC_ALL_RED_TO_CARS:
      SetLights(GPIO_PIN_SET, GPIO_PIN_RESET, GPIO_PIN_RESET,
                GPIO_PIN_SET, GPIO_PIN_RESET);
      break;
    default:
      EnterState(TRAFFIC_CAR_GREEN, now);
      break;
  }
}

static void PollButton(void)
{
  const GPIO_PinState pressed = HAL_GPIO_ReadPin(BUT_GPIO_Port, BUT_Pin);
  if (pressed == GPIO_PIN_RESET && button_latched == 0U) {
    pedestrian_request = 1U;
    button_latched = 1U;
  } else if (pressed == GPIO_PIN_SET) {
    button_latched = 0U;
  }
}

static void TrafficController_Update(void)
{
  const uint32_t now = HAL_GetTick();
  const uint32_t elapsed = now - state_started_at;
  PollButton();

  switch (traffic_state) {
    case TRAFFIC_CAR_GREEN:
      /* Keep cars moving, but serve a pedestrian request after 3 seconds. */
      if (pedestrian_request != 0U && elapsed >= 3000U) {
        pedestrian_request = 0U;
        EnterState(TRAFFIC_CAR_YELLOW, now);
      }
      break;
    case TRAFFIC_CAR_YELLOW:
      if (elapsed >= 2000U) EnterState(TRAFFIC_ALL_RED_TO_PEDESTRIANS, now);
      break;
    case TRAFFIC_ALL_RED_TO_PEDESTRIANS:
      if (elapsed >= 1000U) EnterState(TRAFFIC_PEDESTRIAN_GREEN, now);
      break;
    case TRAFFIC_PEDESTRIAN_GREEN:
      if (elapsed >= 7000U) EnterState(TRAFFIC_PEDESTRIAN_BLINK, now);
      break;
    case TRAFFIC_PEDESTRIAN_BLINK:
      if ((now - blink_started_at) / 500U % 2U == 0U) {
        HAL_GPIO_WritePin(PED_GREEN_GPIO_Port, PED_GREEN_Pin, GPIO_PIN_SET);
      } else {
        HAL_GPIO_WritePin(PED_GREEN_GPIO_Port, PED_GREEN_Pin, GPIO_PIN_RESET);
      }
      if (elapsed >= 4000U) EnterState(TRAFFIC_ALL_RED_TO_CARS, now);
      break;
    case TRAFFIC_ALL_RED_TO_CARS:
      if (elapsed >= 1000U) EnterState(TRAFFIC_CAR_GREEN, now);
      break;
    default:
      EnterState(TRAFFIC_CAR_GREEN, now);
      break;
  }
}
/* USER CODE END 0 */

void SystemClock_Config(void);
static void MX_GPIO_Init(void);

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();

  /* USER CODE BEGIN 2 */
  EnterState(TRAFFIC_CAR_GREEN, HAL_GetTick());
  /* USER CODE END 2 */

  while (1) {
    /* USER CODE BEGIN WHILE */
    TrafficController_Update();
    HAL_Delay(10);
    /* USER CODE END WHILE */
  }
}

void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSE;
  RCC_OscInitStruct.HSEState = RCC_HSE_ON;
  RCC_OscInitStruct.HSEPredivValue = RCC_HSE_PREDIV_DIV1;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;
  RCC_OscInitStruct.PLL.PLLMUL = RCC_PLL_MUL9;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK) Error_Handler();

  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK | RCC_CLOCKTYPE_SYSCLK |
                                RCC_CLOCKTYPE_PCLK1 | RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;
  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_2) != HAL_OK) {
    Error_Handler();
  }
}

static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  __HAL_RCC_GPIOB_CLK_ENABLE();

  HAL_GPIO_WritePin(GPIOB, CAR_RED_Pin | CAR_YELLOW_Pin | CAR_GREEN_Pin |
                           PED_RED_Pin | PED_GREEN_Pin, GPIO_PIN_RESET);
  GPIO_InitStruct.Pin = CAR_RED_Pin | CAR_YELLOW_Pin | CAR_GREEN_Pin |
                        PED_RED_Pin | PED_GREEN_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);

  GPIO_InitStruct.Pin = BUT_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(BUT_GPIO_Port, &GPIO_InitStruct);
}

void Error_Handler(void)
{
  __disable_irq();
  while (1) { }
}

#ifdef USE_FULL_ASSERT
void assert_failed(uint8_t *file, uint32_t line)
{
  (void)file;
  (void)line;
}
#endif
